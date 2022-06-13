import { memoize, reverse } from 'lodash'
import { rateLimitQuery, repoQuery, runQuery, userQuery } from './queries'
import { failure } from './util'
import tokens from '../ignore/tokens.json'

let tokenIdx = 0
function getToken() {
    tokenIdx = (tokenIdx + 1) % tokens.length
    return tokens[tokenIdx]
}

type Source = string & { __?: undefined }
type Target = string & { __?: undefined }

const MAX_STARS = 30_000
const MAX_GAZERS = 30_000
const QUERY_BATCH_SIZE = 50
const uidOf = memoize((s: string) => 'a' + Math.random().toString().slice(2))

/** oldest to newest! */
export async function getAllTargets(args: {
    mode: 'stars' | 'gazers'
    sources: Source[]
    stopAt?: Record<Source, Target>
    logger?: (s: string) => void
    onFail: (source: Source) => void
    onComplete: (source: Source, targets: Target[]) => void
}): Promise<{ queriesLeft: boolean }> {
    const {
        mode,
        sources,
        logger = console.log,
        onFail,
        onComplete,
        stopAt,
    } = args
    const [part1, part2, makeQuery, max] =
        mode == 'stars'
            ? ['starredRepositories', 'nameWithOwner', userQuery, MAX_STARS]
            : ['stargazers', 'login', repoQuery, MAX_GAZERS]
    const targetsOf: Record<Source, Target[]> = {}
    sources.forEach(item => (targetsOf[item] = []))
    const cursors: Record<Source, string | undefined> = {}
    const currentSources = new Set<Source>()
    let numCompleted = 0
    while (currentSources.size < QUERY_BATCH_SIZE) {
        const source = sources.pop()
        if (source == null) break
        currentSources.add(source)
    }
    while (currentSources.size > 0) {
        logger(
            `${currentSources.size} active; ${numCompleted} completed; ${sources.length} remain`
        )
        const queryParts = [...currentSources].map(item =>
            makeQuery(item, uidOf(item), cursors[item])
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query, getToken())
        const remaining = result.data.rateLimit.remaining
        if (remaining < 100) return { queriesLeft: false }
        if (Math.random() < 0.01) {
            console.log('remaining queries:', remaining)
        }

        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const source of [...currentSources]) {
            const uid = uidOf(source)
            if (!result?.data?.[uid]) {
                const errors = JSON.stringify(result?.errors)
                logger(
                    `Dropping item ${source} because it caused errors: ${errors}`
                )
                currentSources.delete(source)
                onFail(source)
                numCompleted++
                continue
            }
            const edges = result['data'][uid][part1]['edges']
            const pageOfTargets: Target[] = reverse(
                edges.map((e: any) => e['node'][part2])
            )
            targetsOf[source].push(...pageOfTargets)
            if (
                edges.length < 100 ||
                targetsOf[source].length >= max ||
                (stopAt?.[source] && pageOfTargets.includes(stopAt[source]))
            ) {
                currentSources.delete(source)
                onComplete(source, reverse(targetsOf[source]))
                delete targetsOf[source]
                numCompleted++
            } else {
                const cursor = edges[0]['cursor']
                cursors[source] = cursor
            }
        }
        while (currentSources.size < QUERY_BATCH_SIZE) {
            const source = sources.pop()
            if (source == null) break
            currentSources.add(source)
        }
    }
    return { queriesLeft: true }
}

/*
export async function getStarCounts(
    sources: string[],
    batchSize: number,
    logger: (s: string) => void
) {
    sources = await asyncFilter(sources, async item => {
        const lfi = (await localForage.getItem(item)) as ItemInfo
        return lfi == null || lfi.stargazerCount == null
    })
    const uidOf = makeDefaultDict(makeUid)
    for (let pointer = 0; pointer < sources.length; pointer += batchSize) {
        logger(
            `Getting stargazer counts ${pointer}:${
                pointer + batchSize
            } out of ${sources.length}`
        )
        const currentsources = sources.slice(pointer, pointer + batchSize)
        const queryParts = currentsources.map(item =>
            stargazerCountQuery(item, uidOf(item))
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const item of [...currentsources]) {
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
