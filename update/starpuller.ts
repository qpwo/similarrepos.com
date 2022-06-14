import { entries, keys, memoize, random, reverse, size } from 'lodash'
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

type SourceAndStopper = [source: Source, stopper: Target | undefined]

type YieldVal =
    | {
          type: 'fail'
          source: string
      }
    | {
          type: 'complete'
          source: string
          targets: Target[]
      }

/** oldest to newest! */
export async function* getAllTargets(args: {
    mode: 'stars' | 'gazers'
    sources: AsyncGenerator<SourceAndStopper> | Generator<SourceAndStopper>
}): AsyncGenerator<YieldVal> {
    const { mode, sources } = args
    const [part1, part2, makeQuery, max] =
        mode == 'stars'
            ? ['starredRepositories', 'nameWithOwner', userQuery, MAX_STARS]
            : ['stargazers', 'login', repoQuery, MAX_GAZERS]
    const table: Record<
        Source,
        { targets: Target[]; cursor?: string; stopAt?: string; uid: string }
    > = {}

    await refillCurrentSources()
    while (size(table) > 0) {
        const queryParts = [...entries(table)].map(
            ([source, { uid, cursor }]) => makeQuery(source, uid, cursor)
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query, getToken())
        const remaining = result?.data?.rateLimit?.remaining
        if (remaining == null) {
            await sleep(random(500, 5000))
            continue
        }
        if (remaining < 100) return { queriesLeft: false }
        if (Math.random() < 0.01) {
            console.log('remaining queries:', remaining)
        }

        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const [source, item] of [...entries(table)]) {
            const uid = item.uid
            if (!result?.data?.[uid]) {
                // const errors = JSON.stringify(result?.errors)
                delete table[source]
                yield { type: 'fail', source }
                continue
            }
            const edges = result['data'][uid][part1]['edges']
            const pageOfTargets: Target[] = reverse(
                edges.map((e: any) => e['node'][part2])
            )
            item.targets.push(...pageOfTargets)
            if (
                edges.length < 100 ||
                item.targets.length >= max ||
                (item.stopAt && pageOfTargets.includes(item.stopAt))
            ) {
                yield {
                    type: 'complete',
                    source,
                    targets: reverse(item.targets),
                }
                delete table[source]
            } else {
                const cursor = edges[0]['cursor']
                table[source].cursor = cursor
            }
        }
        await refillCurrentSources()
    }
    return { queriesLeft: true }

    async function refillCurrentSources() {
        while (size(table) < QUERY_BATCH_SIZE) {
            const { value, done } = await sources.next()
            if (done) break
            const [source, stop] = value
            table[source] = {
                targets: [],
                uid: 'a' + Math.random().toString().slice(2),
                stopAt: stop,
            }
        }
    }
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
