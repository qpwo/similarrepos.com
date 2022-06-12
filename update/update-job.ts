/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { starsdb, gazersdb, statusdb, Repo, User } from './db'
import { getAllTargets } from './starpuller'
import { uniq } from 'lodash'

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
    const sources: User[] = []
    const stopAt: Record<User, Repo> = {}
    console.log('collecting keys')
    for await (const key of starsdb.keys()) {
        const status = await statusdb.get(key)
        if (status.locked) continue
        if (status.type !== 'user') continue
        if (status.lastPulled && new Date(status.lastPulled) > expiredDate)
            continue
        await statusdb.put(key, { ...status, locked: true })

        sources.push(key)
        if (sources.length > DB_BATCH_SIZE) break
    }
    console.log('filling stopAt')

    for (const source of sources) {
        try {
            const targets = await starsdb.get(source)
            stopAt[source] = targets[targets.length - 1]
        } catch {}
    }
    console.log('collected batch from db:', sources)
    console.log('_'.repeat(sources.length))
    await getAllTargets({
        mode: 'stars',
        sources,
        logger: () => {},
        // stopAt,
        onComplete: async (source, targets) => {
            const finalTargets =
                source in stopAt
                    ? uniq([...(await starsdb.get(source)), ...targets])
                    : targets

            process.stdout.write('.')
            statusdb.put(source, {
                hadError: false,
                lastPulled: new Date().toISOString(),
                type: 'user',
                locked: false,
            })
            starsdb.put(source, finalTargets)
            // add new targets to status db so we will fetch them later
            for (const t of targets) {
                try {
                    await statusdb.get(t)
                } catch {
                    statusdb.put(t, {
                        hadError: false,
                        lastPulled: false,
                        type: 'repo',
                        locked: false,
                    })
                }
            }
        },
        onFail(source) {
            process.stdout.write('X')
            statusdb.put(source, {
                hadError: true,
                lastPulled: new Date().toISOString(),
                type: 'user',
                locked: false,
            })
        },
    })
    console.log('all done')
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
