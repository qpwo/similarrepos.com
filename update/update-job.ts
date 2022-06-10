/**
 * The costar graph is highly connected, so a single-run updateStars and
 * updateGazers is probably adequate. A fancier back-and-forth stack-based
 * traversal would be slightly more complete but unnecessarily complicates the
 * database update logic.
 */

import { starsdb, gazersdb, statusdb } from './db'
import tokens from '../ignore/tokens.json'
const token = tokens[0]

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
    throw new Error('Function not implemented.')
}

/** Find stars of missing or expired users, and update statusdb */
async function updateStars() {
    throw new Error('Function not implemented.')
}

/** Find gazers of missing or expired repos, and update statusdb */
async function updateGazers() {
    throw new Error('Function not implemented.')
}

/** Recompute costar graph with new data */
async function updateCostars() {
    throw new Error('Function not implemented.')
}
