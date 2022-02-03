'use strict'

import localForage from 'localforage'
import { getStarCounts, batchLoop, ItemInfo } from './starpuller.js'

function updateLoginButton() {
    if (window.localStorage.getItem('token')) {
        // show logout
    } else {
        // show login
    }
}

function logout() {
    localStorage.removeItem('token')
}

function getCountOf(array: string[]): [string, number][] {
    var unsorted: Record<string, number> = {}
    array.forEach(val => (unsorted[val] = (unsorted[val] || 0) + 1))
    return Object.entries(unsorted).sort(([, v1], [, v2]) => v2 - v1)
}

function logger(...args: any[]) {
    const div = document.createElement('div')
    div.innerText = JSON.stringify(Object.values(args))
    // status.appendChild(div)
}

async function asyncMap<T, S>(arr: T[], f: (t: T) => Promise<S>) {
    return await Promise.all(arr.map(f))
}

export async function doRepo(repo: string) {
    // const repo = repoInput.value
    logger('Getting stargazers of repo')
    await batchLoop([repo], 'stargazers', 50, logger)
    logger('Got stargazers of repo')
    const lfRepo: ItemInfo | null = await localForage.getItem(repo)
    if (lfRepo == null) {
        throw Error("couldn't find repo")
    }
    // if (!collector[repo].failed) {
    const repo_items = lfRepo.items
    logger(`Getting stars of ${repo_items.length} stargazers`)
    await batchLoop(repo_items, 'stars', 50, logger)
    logger('Got stars of stargazers')
    // }
    const itemsOf = async (user: string) => {
        const lfUser: ItemInfo | null = await localForage.getItem(user)
        if (lfUser == null) {
            console.log(`user ${user} is missing`) // TODO: should never happen?
            return []
        }
        return lfUser.items
    }
    const foo = await asyncMap(repo_items, itemsOf)
    const countOf = getCountOf(foo.flat())
    const goodCountOf = countOf.filter(([, val]) => val > 3)
    const costarredRepos = goodCountOf.map(([key]) => key)
    logger(
        `Getting stargazer counts of ${costarredRepos.length} costarred repos.`
    )
    await getStarCounts(costarredRepos, 50, logger)
    const weightedCountOf = (
        await asyncMap(goodCountOf, async ([repo, count]) => {
            const repo2Info: ItemInfo | null = await localForage.getItem(repo)
            if (repo2Info == null) {
                throw Error('repo be null')
            }
            const stargazerCount = repo2Info.stargazerCount
            if (stargazerCount == null) {
                throw Error('uh its null')
            }
            return {
                repo,
                costars: count,
                stargazers: stargazerCount,
                score: count <= 3 ? -1 : count / stargazerCount,
            }
        })
    ).sort((o1, o2) => o2.score - o1.score)
    // logger("goodCountOf:", goodCountOf)
    // logger("weightedCountOf:", weightedCountOf)
    // similarDiv.innerHTML = ""
    weightedCountOf.slice(0, 100).forEach(o => {
        const aElm = document.createElement('a')
        aElm.href = 'https://github.com/' + o.repo
        aElm.innerText = o.repo
        const span1 = document.createElement('span')
        span1.innerText = `${o.costars} costars / ${o.stargazers} total stars = ${o.score}`
        const div = document.createElement('div')
        div.appendChild(aElm)
        div.appendChild(span1)
        // similarDiv.appendChild(div)
    })
    // similarDiv.innerText = JSON.stringify()
}
// byId("doRepo").onclick = doRepo
