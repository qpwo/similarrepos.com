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
const DB_BATCH_SIZE = 5000

async function main() {
    await runDbBatch('gazers')
    await updateGazers()
    await updateCostars()
}

async function updateEntireDb() {}

type Source = string
type Target = string
/** Find targets of missing or expired sources and update statusdb */
async function runDbBatch(
    mode: 'stars' | 'gazers'
): Promise<{ queriesLeft: boolean }> {
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

        sources.push(source)
        if (sources.length >= DB_BATCH_SIZE) break
    }
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
    const chunks = chunk(sources, (sources.length / 4) | 0)
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
    return { queriesLeft }

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

main()
