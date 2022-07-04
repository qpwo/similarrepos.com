import { Costar, gazersdb, numGazersdb, Repo, starsdb } from './db'

const MAX_GAZER_CHECK = 1000
export async function topSimilar(repo: string) {
    const users = (await gazersdb.get(repo)).slice(-MAX_GAZER_CHECK)
    const numGazers0 = await numGazersdb.get(repo)
    if (users.length <= 2) return []

    const coreposArr = await starsdb.getMany(users)
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
    const corepos = Object.keys(costars)

    const numGazersArr = await numGazersdb.getMany(corepos)
    const result: Costar[] = corepos.map((repoB, i) => {
        const numGazers = numGazersArr[i] ?? 1
        return {
            costars: costars[repoB],
            repo: repoB,
            totalStars: numGazers,
            score: costars[repoB] / (numGazers0 + numGazers),
        }
    })
    result.sort((x, y) => y.score - x.score)

    return result.slice(0, 40)
}
