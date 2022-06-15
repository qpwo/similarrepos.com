import { chunk, range, uniq, zip } from 'lodash'
import { gazersdb, Repo, starsdb, statusdb } from './db'

const BATCH_SIZE = 500

interface Match {
    costars: number
    totalStars: number
    name: Repo
    score: number
}

async function topSimilar(repo: string) {
    const users0_ = await gazersdb.get(repo)
    const users0 = users0_.slice(-1000)
    console.log(`there are ${users0.length} gazers of ${repo}`)
    if (users0.length <= 1) return []

    // get similar repos
    const coreposArr = await starsdb.getMany(users0)
    const costars: Record<Repo, number> = {}
    for (const repos of coreposArr) {
        if (repos == null) continue
        for (const repo of repos) {
            costars[repo] = (costars[repo] ?? 0) + 1
        }
    }
    const total = Object.keys(costars).length
    const threshold =
        total < 10
            ? 0
            : total < 100
            ? 2
            : total < 1000
            ? 10
            : total < 1000
            ? 20
            : 50

    // delete entries with less than `threshold` costars
    for (const key of Object.keys(costars)) {
        if (costars[key] < threshold) delete costars[key]
    }

    const corepos = Object.keys(costars)
    console.log(`there are ${corepos.length} corepos`)

    // get total gazers of each repo
    const result: Match[] = []
    for (const batch of chunk(corepos, BATCH_SIZE)) {
        console.log('doing gazercount batch')
        for (const [repo, users1] of zip(
            corepos,
            await gazersdb.getMany(batch)
        )) {
            if (repo == null) throw Error('null repo??')
            if (users1 == null) continue
            result.push({
                costars: costars[repo],
                name: repo,
                totalStars: users1.length,
                score: costars[repo] / (users0.length + users1.length),
            })
        }
    }
    result.sort((x, y) => y.score - x.score)

    return result.slice(0, 20)
}

async function test() {
    const repo = 'rust-lang/rust'
    const res = await topSimilar(repo)
    console.log(res)
}

if (process.env.test === 'yes') test()
