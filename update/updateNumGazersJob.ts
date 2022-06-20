/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { numGazersdb } from './db'
import { getNumGazers } from './numGazerPuller'
const NUM_PARALLEL_PULLERS = 5

async function main() {
    await updateAllStarCounts()
}

async function updateAllStarCounts(): Promise<void> {
    const sourcesGen = keyGenerator()
    let numComplete = 0
    await Promise.all(
        Array.from({ length: NUM_PARALLEL_PULLERS }, async () => {
            for await (const res of getNumGazers(sourcesGen)) {
                if (res.type === 'complete') {
                    process.stdout.write(res.source + '-finish ')
                    numGazersdb.put(res.source, res.numGazers)
                    numComplete++
                    if (numComplete % 50 === 0) {
                        log({ numComplete })
                    }
                }
            }
        })
    )
    log(`updated ${numComplete} total entries`)
}

async function* keyGenerator(): AsyncGenerator<string> {
    let numSkipped = 0
    for await (const [repo, supposedNumGazers] of numGazersdb.iterator()) {
        if (supposedNumGazers < 20_000) {
            numSkipped++
            if (numSkipped % 100_000 === 0)
                log(`skipped ${numSkipped.toLocaleString()} repos`)
            continue
        }
        process.stdout.write(repo + '-start ')
        yield repo
    }
}

async function log(...args: any[]) {
    console.log(new Date(), ...args)
}

main()
