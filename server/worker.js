const { parentPort, workerData } = require('worker_threads')
const { appendFileSync } = require('fs')
const { log, frac, hhmmss } = require('./common')

parentPort.postMessage(
    precomputeSimilar(
        workerData.keys,
        workerData.gazers,
        workerData.stars,
        workerData.nameMap
    )
)

function precomputeSimilar(repos, gazers, stars, nameMap) {
    const precomputeUpdateInterval = 100
    let i = 0
    const start = Date.now()
    // for (const r of gazers.keys()) {
    for (const r of repos) {
        if (i < 10 || i % precomputeUpdateInterval === 0) {
            log(
                'precomputed',
                frac(i, repos.length),
                'precompute duration:',
                hhmmss(Date.now() - start)
            )
        }
        // similar[r] = topSimilar(r)
        const niceSimilar = topSimilar(r, gazers, stars).map(([r2, count]) => [
            nameMap.get(r2),
            count,
        ])
        if (niceSimilar.length > 0)
            appendFileSync('similar.jsonl', JSON.stringify(niceSimilar) + '\n')
        i++
    }
}

function topSimilar(repo, gazers, stars) {
    const users = gazers.get(repo)
    // if (users.length <= 1) {
    //     return []
    // }
    const counts = new Map()
    for (const u of users) {
        for (const r of stars.get(u)) {
            counts.set(r, (counts.get(r) ?? 0) + 1)
        }
    }
    const entries = Array.from(counts.entries())
    entries.sort((e1, e2) => e1[1] - e2[1])
    return entries.slice(0, 100)
}
