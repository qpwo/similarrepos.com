import { memoize } from 'lodash'
import { rateLimitQuery, repoQuery, runQuery, userQuery } from './queries'
import { failure } from './util'

type Source = string & { __?: undefined }
type Target = string & { __?: undefined }

const maxStars = 10
const maxStargazers = 10
const uidOf = memoize((s: string) => 'a' + Math.random().toString().slice(2))

export async function getAllEdges(args: {
    mode: 'stars' | 'gazers'
    items: Source[]
    batchSize: number
    logger: (s: string) => void
    token: string
}): Promise<{ results: Record<Source, Target[]>; failures: Source[] }> {
    const { mode, items, batchSize, logger, token } = args
    const [part1, part2, makeQuery, max] =
        mode == 'stars'
            ? ['starredRepositories', 'nameWithOwner', userQuery, maxStars]
            : ['stargazers', 'login', repoQuery, maxStargazers]

    // MARK: could filter out recently-fetched items here

    const targetsOf: Record<Source, Target[]> = {}
    items.forEach(item => (targetsOf[item] = []))
    const failures: Source[] = []
    const cursors: Record<Source, string | undefined> = {}
    const currentSources = new Set(items.slice(items.length - batchSize))
    let pointer = currentSources.size
    while (currentSources.size > 0) {
        logger(
            `Completed ${pointer - currentSources.size} out of ${items.length}`
        )
        const queryParts = [...currentSources].map(item =>
            makeQuery(item, uidOf(item), cursors[item])
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query, token)
        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const item of [...currentSources]) {
            const uid = uidOf(item)
            if (!result?.data?.[uid]) {
                logger(
                    `Dropping item ${item} because it caused errors: ${JSON.stringify(
                        result
                    )}`
                )
                currentSources.delete(item)
                failures.push(item)
                continue
            }
            const edges = result['data'][uid][part1]['edges']
            edges.forEach((e: any) => targetsOf[item].push(e['node'][part2]))
            if (edges.length < 100 || targetsOf[item].length >= max) {
                currentSources.delete(item)
            } else {
                const cursor = edges[edges.length - 1]['cursor']
                cursors[item] = cursor
                // MARK: could save lastCursor here. lastCursor = cursor
            }
        }
        if (currentSources.size < batchSize && pointer < items.length) {
            const addCount = Math.min(
                batchSize - currentSources.size,
                items.length - pointer
            )
            items
                .slice(pointer, pointer + addCount)
                .forEach(item => currentSources.add(item))
            pointer += addCount
        }
    }
    return { results: targetsOf, failures }
}

/*
export async function getStarCounts(
    items: string[],
    batchSize: number,
    logger: (s: string) => void
) {
    items = await asyncFilter(items, async item => {
        const lfi = (await localForage.getItem(item)) as ItemInfo
        return lfi == null || lfi.stargazerCount == null
    })
    const uidOf = makeDefaultDict(makeUid)
    for (let pointer = 0; pointer < items.length; pointer += batchSize) {
        logger(
            `Getting stargazer counts ${pointer}:${
                pointer + batchSize
            } out of ${items.length}`
        )
        const currentItems = items.slice(pointer, pointer + batchSize)
        const queryParts = currentItems.map(item =>
            stargazerCountQuery(item, uidOf(item))
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const item of [...currentItems]) {
            // TODO: Could be in a separate table for faster read/write
            const coll_i: ItemInfo =
                (await localForage.getItem(item)) ?? makeItemInfo(item)
            const uid = uidOf(item)
            if (!has(result['data'], uid)) {
                logger(`Item ${item} caused errors`)
                continue
            }
            coll_i.stargazerCount = result['data'][uid]['stargazerCount']
            await localForage.setItem(item, coll_i)
        }
    }
}
*/
