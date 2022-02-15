// rm -f go-for-the-query.js && tsc go-for-the-query.ts --esModuleInterop && echo 'starting' && node go-for-the-query.js
const sqlite = require('better-sqlite3')
const { appendFileSync } = require('fs')
const { performance } = require('perf_hooks')
const { sql } = require('./util')

const db = sqlite('sqlite.db')

// others:
// 'swiftyapp/swifty': 600
// 'preactjs/preact': 20-30k
// 'srid/neuron': about 1k

const idHopefully = db
    .prepare(sql`SELECT repoId from repoIds where repoName = ?`)
    .get('srid/neuron')

log({ idHopefully })

const repoHopefully = db
    .prepare(sql`SELECT repoName from repoIds where repoId = ?`)
    .get(idHopefully.repoId)

log({ repoHopefully })

// /*

function f() {
    // one way to do this would be to precompute values for the 100k most popular repos.
    // job would probably finish in a week.
    log('i sure hope this works')
    const before = performance.now()
    const result = db
        .prepare(
            sql`
    SELECT s1.repoID, COUNT(*) as num
    FROM stars s1, stars s2
    WHERE s2.repoId = ? AND s1.userId = s2.userId
    GROUP BY s1.repoId
    ORDER BY num DESC
    LIMIT 4;
`
        )
        .all(idHopefully.repoId)
    const after = performance.now()

    log('It is over')
    log({ result, elapsed: after - before })
    //  */
}

log('ONE')
f()
// log('TWO')
// f()
// log('THREE')
// f()

function log(...args) {
    console.log(new Date().toLocaleString(), memoryUsed(), ...args)
    appendFileSync(
        'log.txt',
        JSON.stringify([new Date().toLocaleString(), memoryUsed(), ...args]) +
            '\n'
    )
}
function memoryUsed() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    return `${Math.round(used * 100) / 100} MB`
}
