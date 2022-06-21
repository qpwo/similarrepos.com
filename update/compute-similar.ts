import { Costar, gazersdb, numGazersdb, Repo, starsdb } from './db'
import { log } from './util'

const MAX_GAZER_CHECK = 1000

export async function topSimilar(repo: string) {
    // log('start')
    const users = (await gazersdb.get(repo)).slice(-MAX_GAZER_CHECK)
    const numGazers0 = await numGazersdb.get(repo)
    // log('got gazers and numGazers')
    if (users.length <= 2) return []

    const coreposArr = await starsdb.getMany(users)
    // log('did starsDb.getMany()')
    const allCostars: Record<Repo, number> = {}
    for (const repos of coreposArr) {
        if (repos == null) continue
        for (const repo of repos) {
            allCostars[repo] = (allCostars[repo] ?? 0) + 1
        }
    }
    const costars = allCostars

    // const costars = Object.fromEntries(
    //     Object.entries(allCostars)
    //         .sort((x, y) => y[1] - x[1])
    //         .slice(2000)
    // )

    for (const key of Object.keys(costars)) {
        if (costars[key] <= 1) delete costars[key]
    }

    const corepos = Object.keys(costars)

    const numGazersArr = await numGazersdb.getMany(corepos)
    // log('did numGazersdb.getMany()')
    const result: Costar[] = corepos.map((repo, i) => ({
        costars: costars[repo],
        repo,
        totalStars: numGazersArr[i],
        score: costars[repo] / (numGazers0 + numGazersArr[i]),
    }))
    result.sort((x, y) => y.score - x.score)
    // log('sorted')

    return result.slice(0, 10)
}

async function test1() {
    for (const repo of [
        'qpwo/actual-malware',
        'golang/go',
        'preactjs/preact',
    ]) {
        const result = await topSimilar(repo)
        log('\n\n\n\nrepo:', repo)
        log('result:', result)
    }
}

if (process.env.test === 'yes') test1()
