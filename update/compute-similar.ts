import { Costar, gazersdb, numGazersdb, Repo, starsdb } from './db'

const MAX_GAZER_CHECK = 1000

export async function topSimilar(repo: string) {
    // logDelta('start')
    const users = (await gazersdb.get(repo)).slice(-MAX_GAZER_CHECK)
    const numGazers0 = await numGazersdb.get(repo)
    // logDelta('got gazers and numGazers')
    // console.log(`there are ${users.length} gazers of ${repo}`)
    if (users.length <= 2) return []

    // get similar repos
    const coreposArr = await starsdb.getMany(users)
    // logDelta('did starsDb.getMany()')
    const costars: Record<Repo, number> = {}
    for (const repos of coreposArr) {
        if (repos == null) continue
        for (const repo of repos) {
            costars[repo] = (costars[repo] ?? 0) + 1
        }
    }
    for (const key of Object.keys(costars)) {
        if (costars[key] <= 1) delete costars[key]
    }
    // const costars = Object.fromEntries(
    //     Object.entries(costars)
    //         .sort((x, y) => y[1] - x[1])
    //         .slice(2000)
    //         .map(x => x[0])
    // )

    const corepos = Object.keys(costars)
    // console.log(`there are ${corepos.length} corepos`)

    const numGazersArr = await numGazersdb.getMany(corepos)
    // logDelta('did numGazersdb.getMany()')
    // console.log('stars of corepos:', zip(corepos, numGazersArr))
    const result: Costar[] = corepos.map((repo, i) => ({
        costars: costars[repo],
        repo,
        totalStars: numGazersArr[i],
        score: costars[repo] / (numGazers0 + numGazersArr[i]),
        // computedAt: new Date().toISOString(),
    }))
    result.sort((x, y) => y.score - x.score)
    // logDelta('sorted')

    return result.slice(0, 40)
}

async function test1() {
    for (const repo of [
        'qpwo/actual-malware',
        // 'golang/go',
        // 'preactjs/preact',
    ]) {
        const result = await topSimilar(repo)
        console.log('\n\n\n\nrepo:', repo)
        console.log('result:', result)
    }
}

if (process.env.test === 'yes') test1()
