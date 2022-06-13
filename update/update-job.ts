/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { starsdb, gazersdb, statusdb, Repo, User } from './db'
import { getAllTargets } from './starpuller'
import { range, uniq } from 'lodash'

const WEEK = 7 * 24 * 60 * 60 * 1000
const expiredDate = new Date(Date.now() - WEEK)
const DB_BATCH_SIZE = 500

async function main() {
    await cleanDatabases()
    await updateStars()
    await updateGazers()
    await updateCostars()
}

/** Remove deleted users and repos from the graph.
 * Important because sometimes popular repos change their name or org.
 */
async function cleanDatabases() {
    // 1. gather all deleted users
    // 2. remove them from starsdb keys and gazersdb values
    // 3. gather all deleted repos
    // 4. remove them from gazersdb keys and starsdb values
    // 5. add them to record of deleted repos and users
}

/** Find stars of missing or expired users, and update statusdb */
async function updateStars() {
    let numDiscovered = 0
    const sources: User[] = []
    const stopAt: Record<User, Repo> = {}
    console.log('collecting keys')
    for await (const key of statusdb.keys()) {
        const status = await statusdb.get(key)
        if (
            status.type !== 'user' ||
            status.hadError ||
            (status.lastPulled && new Date(status.lastPulled) > expiredDate)
        )
            continue

        sources.push(key as User)
        if (sources.length >= DB_BATCH_SIZE) break
    }
    console.log('filling stopAt')

    await Promise.all(
        sources.map(async source => {
            try {
                const targets = await starsdb.get(source)
                stopAt[source] = targets[targets.length - 1]
            } catch {}
        })
    )
    console.log(`${Object.keys(stopAt).length} queries will stop early`)
    console.log(`update tables from ${sources[0]} to ${sources.at(-1)}`)
    console.log('_'.repeat(sources.length))
    await getAllTargets({
        mode: 'stars',
        sources,
        logger: () => {},
        stopAt,
        onComplete,
        onFail,
    })
    console.log('all done')
    console.log(`${numDiscovered} new repos discovered`)
    async function onComplete(source: string, targets: string[]) {
        const finalTargets =
            source in stopAt
                ? uniq([...(await starsdb.get(source)), ...targets])
                : targets

        process.stdout.write('.')
        statusdb.put(source, {
            hadError: false,
            lastPulled: new Date().toISOString(),
            type: 'user',
        })
        starsdb.put(source, finalTargets)
        // add new targets to status db so we will fetch them later
        const targetStatuses = await statusdb.getMany(targets)
        const b = statusdb.batch()
        for (const i of range(targets.length)) {
            if (targetStatuses[i] == null) {
                numDiscovered++
                b.put(targets[i], {
                    hadError: false,
                    lastPulled: false,
                    type: 'repo',
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
            type: 'user',
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
