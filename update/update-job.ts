/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { starsdb, gazersdb, statusdb, Repo, User } from './db'
import tokens from '../ignore/tokens.json'
import { getAllEdges } from './starpuller'

const token = tokens[0]
const WEEK = 7 * 24 * 60 * 60 * 1000
const expiredDate = new Date(Date.now() - WEEK)
const DB_BATCH_SIZE = 20

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
    let batch: User[] = []
    for await (const key of starsdb.keys()) {
        const status = await statusdb.get(key)
        if (status.locked) continue
        if (status.type !== 'user') continue
        if (status.lastPulled && new Date(status.lastPulled) > expiredDate)
            continue
        await statusdb.put(key, { ...status, locked: true })
        batch.push(key)
        await statusdb.put(key, {
            hadError: false,
            lastPulled: new Date().toISOString(),
            type: 'user',
            locked: false,
        })
        if (batch.length > DB_BATCH_SIZE) break
    }
    console.log('collected batch from db:', batch)
    const { failures, results } = await getAllEdges({
        mode: 'stars',
        items: batch,
        batchSize: 50,
        logger: console.log,
        token,
    })
    console.log({ failures, results })
    const b1 = statusdb.batch()
    for (const user of failures) {
        b1.put(user, {
            hadError: true,
            lastPulled: new Date().toISOString(),
            type: 'user',
            locked: false,
        })
    }
    await b1.write()
    const b2 = statusdb.batch()
    const sb = starsdb.batch()
    for (const [user, repos] of Object.entries(results)) {
        b2.put(user, {
            hadError: false,
            lastPulled: new Date().toISOString(),
            type: 'user',
            locked: false,
        })
        sb.put(user, repos)
    }
    await Promise.all([b2.write(), sb.write])
    console.log('added all to database')
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
