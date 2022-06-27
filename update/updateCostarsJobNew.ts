/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { readFileSync } from 'fs'
import { deserialize } from 'v8'
import { Costar, costarsdb, gazersdb, numGazersdb, Repo, starsdb } from './db'
import { log, readNumGazersMap } from './util'

const WEEK = 1000 * 60 * 60 * 24 * 7
const started = Date.now()
const lastWeek = started - WEEK
const myIndex = process.env.myIndex
log({ myIndex })

const MAX_GAZER_CHECK = 1000

// log('about to read myRepos')
// const myRepos: string[] = deserialize(readFileSync(`repos${myIndex}.v8`))

log('about to read map')
const numGazersMap = readNumGazersMap()
// const numGazersMap = new Map<string, number>()
log('done reading map')

let numComplete = 0,
    numFail = 0,
    numSkipped = 0,
    numIterations = 0
let lastOut: string | null = null

const keygen = numGazersdb.keys()
/*
const keygen = (function* () {
    // for (const key of myRepos) {
    for (const key of numGazersMap.keys()) {
        yield key
    }
})()
*/

async function main() {
    updateAllStarCounts()
}

async function updateAllStarCounts(): Promise<void> {
    for await (const repo of keygen) {
        if (numIterations % 1000 === 0) {
            const seconds = (Date.now() - started) / 1000
            const reposPerSecond = (numComplete / seconds).toFixed(2)
            log({
                numIterations,
                numComplete,
                numFail,
                numSkipped,
                next: repo,
                reposPerSecond,
                lastOut: lastOut,
            })
        }
        numIterations++
        try {
            const old = await costarsdb.get(repo)
            if (new Date(old.computed).getTime() > lastWeek) {
                numSkipped++
                continue
            }
        } catch {}
        try {
            const res = await topSimilar(repo)
            lastOut = JSON.stringify({ repo, res })
            await costarsdb.put(repo, {
                computed: new Date().toISOString(),
                costars: res,
            })
            numComplete++
        } catch (e) {
            console.error(e)
            numFail++
        }
    }
}

async function topSimilar(repo: string) {
    const users = (await gazersdb.get(repo)).slice(-MAX_GAZER_CHECK)
    const numGazers0 = await numGazersdb.get(repo)
    if (users.length <= 2) return []

    const coreposArr = await starsdb.getMany(users)
    const costars: Record<Repo, number> = {}
    for (const repos of coreposArr) {
        if (repos == null) continue
        for (const repo of repos) {
            costars[repo] = (costars[repo] ?? 0) + 1
        }
    }
    for (const key of Object.keys(costars)) {
        if (costars[key] <= 1) delete costars[key]
    }
    const corepos = Object.keys(costars)

    const numGazers = numGazersMap.get(repo) ?? -1
    const result: Costar[] = corepos.map((repo, i) => ({
        costars: costars[repo],
        repo,
        totalStars: numGazers,
        score: costars[repo] / (numGazers0 + numGazers),
    }))
    result.sort((x, y) => y.score - x.score)

    return result.slice(0, 40)
}

main()
