/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { topSimilar } from './compute-similar'
import { numGazersdb, costarsdb } from './db'

const WEEK = 1000 * 60 * 60 * 24 * 7
const started = Date.now()
const lastWeek = started - WEEK

let numComplete = 0,
    numFail = 0,
    numSkipped = 0,
    numIterations = 0
let lastOut: string | null = null

const keygen = (async function* () {
    for await (const key of numGazersdb.keys()) {
        yield key
    }
})()

async function main() {
    await Promise.all([
        updateAllStarCounts(),
        updateAllStarCounts(),
        updateAllStarCounts(),
    ])
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
        } catch {
            numFail++
        }
    }
}

async function log(...args: any[]) {
    console.log(new Date(), ...args)
}

main()
