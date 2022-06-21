/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { readFileSync } from 'fs'
import { deserialize } from 'v8'
import { Costar, costarsdb, gazersdb, numGazersdb, Repo, starsdb } from './db'
import { log as log_, readNumGazersMap, sleep } from './util'

import cluster from 'cluster'

const MAX_GAZER_CHECK = 1000
const WEEK = 1000 * 60 * 60 * 24 * 7
const started = Date.now()
const lastWeek = started - WEEK
const myIndex = process.env.myIndex
log({ myIndex })

if (cluster.isPrimary) {
    for (let myIndex = 0; myIndex < 3; myIndex++) {
        log(`forking with ${myIndex}`)
        cluster.fork({ myIndex })
    }
    cluster.on('exit', (worker, code, signal) => {
        log(`worker ${worker.process.pid} died`)
    })
} else {
    main()
}
// const numGazersMap = new Map<string, number>()

async function main() {
    log('about to read myRepos')
    const myRepos: string[] = deserialize(readFileSync(`repos${myIndex}.v8`))

    log('about to read map')
    const numGazersMap = readNumGazersMap()
    log('starting')
    updateAllStarCounts(myRepos, numGazersMap)
}

async function updateAllStarCounts(
    myRepos: string[],
    numGazersMap: Map<string, number>
): Promise<void> {
    let numComplete = 0,
        numFail = 0,
        numSkipped = 0,
        numIterations = 0
    let lastOut: string | null = null
    for await (const repo of myRepos) {
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
            const res = await topSimilar(repo, numGazersMap)
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

async function topSimilar(repo: string, numGazersMap: Map<string, number>) {
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

function log(...args: unknown[]) {
    log_(`[${process.env.myIndex}]`, ...args)
}
