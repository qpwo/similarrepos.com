import { entries, memoize, random, reverse, size } from 'lodash'
import tokens from '../ignore/tokens.json'
import { Repo } from './db'
import {
    rateLimitQuery,
    repoQuery,
    runQuery,
    stargazerCountQuery,
    userQuery,
} from './queries'
import { failure } from './util'

let tokenIdx = 0
function getToken() {
    tokenIdx = (tokenIdx + 1) % tokens.length
    return tokens[tokenIdx]
}

const QUERY_BATCH_SIZE = 200
const MAX_RETRIES = 8

type YieldVal =
    | {
          type: 'fail'
          source: string
      }
    | {
          type: 'complete'
          source: string
          numGazers: number
      }

const repoOf: Record<string, string> = {}
const uidOf = memoize((repo: string) => {
    const uid = 'a' + Math.random().toString().slice(2)
    repoOf[uid] = repo
    return uid
})

export async function* getNumGazers(
    sources: AsyncGenerator<Repo> | Generator<Repo>
): AsyncGenerator<YieldVal, void, void> {
    let retryCount = 0
    let currentSources = await getRepoBatch()
    while (currentSources.length > 0) {
        const queryParts = currentSources.map(repo =>
            stargazerCountQuery(repo, uidOf(repo))
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query, getToken())
        const remaining = result?.data?.rateLimit?.remaining
        if (remaining == null || remaining < 100) {
            console.log(new Date(), 'remaining:', remaining)
            if (retryCount > MAX_RETRIES) {
                // get a whole new batch
                console.log(
                    new Date(),
                    'retry sequence failed, getting fresh batch'
                )
                for (const repo of currentSources) {
                    yield { type: 'fail', source: repo }
                }
                currentSources = await getRepoBatch()
                continue
            }
            retryCount++
            const sleepSeconds = 2 ** (retryCount + 2) * (Math.random() + 0.5)
            console.log(
                new Date(),
                `query failed, sleeping ${sleepSeconds} and retrying`
            )
            await sleep(1000 * sleepSeconds)
            continue
        }
        retryCount = 0
        console.log({ result })
        for (const uid in result?.data) {
            if (uid === 'rateLimit') continue
            const numGazers = result?.data?.[uid]?.stargazerCount
            const source = repoOf[uid]
            if (source == null) throw Error('unreachable')
            if (numGazers) yield { type: 'complete', numGazers, source }
            else yield { type: 'fail', source }
        }
        currentSources = await getRepoBatch()
    }
    async function getRepoBatch() {
        const batch: Repo[] = []
        while (batch.length < QUERY_BATCH_SIZE) {
            const { value, done } = await sources.next()
            if (done) break
            if (Math.random() < 1 / 1000) {
                console.log('\n current:', value)
            }
            batch.push(value)
        }
        return batch
    }
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
