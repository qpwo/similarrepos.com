/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { starsdb, gazersdb, statusdb, Repo, User } from './db'
import { getAllTargets } from './starpuller'
import { chunk, range, uniq } from 'lodash'

const WEEK = 7 * 24 * 60 * 60 * 1000
const expiredDate = new Date(Date.now() - WEEK)
const DB_BATCH_SIZE = 20_000
const ESTIMATED_MAX_RECORDS = 10_000_000
const NUM_PARALLEL_PULLERS = 20

async function main() {
    await updateEntireDb()
    // await updateCostars()
}

async function updateEntireDb() {
    const numBatches = (ESTIMATED_MAX_RECORDS / DB_BATCH_SIZE) | 0
    for (const i of range(numBatches)) {
        console.log(('\n' + '='.repeat(80) + '\n').repeat(2))
        console.log(`STARTING BATCH ${i} / ${numBatches}`)
        for (const mode of ['stars', 'gazers']) {
            const res = await runDbBatch('gazers')
            console.log(res)
            if (!res.queriesLeft) {
                console.log('OUT OF QUERIES, sleeping half an hour')
                await sleep(1000 * 60 * 30)
            }
            if (res.allSourcesComplete) {
                console.log('WE ARE DONE')
                return
            }
        }
        console.log(('\n' + '='.repeat(80) + '\n').repeat(2))
    }
}

type Source = string
type Target = string
/** Find targets of missing or expired sources and update statusdb */
async function runDbBatch(
    mode: 'stars' | 'gazers'
): Promise<{ queriesLeft: boolean; allSourcesComplete: boolean }> {
    const [sourceType, targetType, edgedb] =
        mode === 'stars'
            ? (['user', 'repo', starsdb] as const)
            : (['repo', 'user', gazersdb] as const)
    let numDiscovered = 0
    const sources: Source[] = []
    const stopAt: Record<Source, Target> = {}
    console.log('collecting sources')
    for await (const source of statusdb.keys()) {
        const status = await statusdb.get(source)
        if (
            status.type !== sourceType ||
            status.hadError ||
            (status.lastPulled && new Date(status.lastPulled) > expiredDate)
        )
            continue

        // if (sources.length % 100_000 === 0)
        //     console.log(`gathered ${sources.length} sources`)
        sources.push(source)
        if (sources.length >= DB_BATCH_SIZE) break
    }
    if (sources.length === 0)
        return { queriesLeft: true, allSourcesComplete: true }
    await Promise.all(
        sources.map(async source => {
            try {
                const targets = await edgedb.get(source)
                stopAt[source] = targets[targets.length - 1]
            } catch {}
        })
    )
    console.log(
        `${Object.keys(stopAt).length}/${
            sources.length
        } queries will stop early`
    )
    console.log(`updating edgedb from ${sources[0]} to ${sources.at(-1)}`)
    console.log('_'.repeat(sources.length))
    const chunks = chunk(sources, (sources.length / NUM_PARALLEL_PULLERS) | 0)
    const responses = await Promise.all(
        chunks.map(ch =>
            getAllTargets({
                mode,
                sources: ch,
                logger: () => {},
                stopAt,
                onComplete,
                onFail,
            })
        )
    )
    const queriesLeft = responses.every(r => r.queriesLeft)
    console.log('batch done')
    console.log(`${numDiscovered} new targets discovered`)
    return { queriesLeft, allSourcesComplete: false }

    async function onComplete(source: string, targets: string[]) {
        const finalTargets =
            source in stopAt
                ? uniq([...(await edgedb.get(source)), ...targets])
                : targets

        process.stdout.write('.')
        statusdb.put(source, {
            hadError: false,
            lastPulled: new Date().toISOString(),
            type: sourceType,
        })
        edgedb.put(source, finalTargets)
        // add new targets to status db so we will fetch them later
        const targetStatuses = await statusdb.getMany(targets)
        const b = statusdb.batch()
        for (const i of range(targets.length)) {
            if (targetStatuses[i] == null) {
                numDiscovered++
                b.put(targets[i], {
                    hadError: false,
                    lastPulled: false,
                    type: targetType,
                })
            }
        }
        b.write()
    }

    async function onFail(source: string) {
        process.stdout.write('X')
        statusdb.put(source, {
            hadError: true,
            lastPulled: new Date().toISOString(),
            type: sourceType,
        })
    }
}

/** Find gazers of missing or expired repos, and update statusdb */
async function updateGazers() {
    // throw new Error('Function not implemented.')
}

/** Recompute costar graph with new data */
async function updateCostars() {
    // throw new Error('Function not implemented.')
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

main()
