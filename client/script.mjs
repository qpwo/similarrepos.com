"use strict"

import localforage from "./localforage.js"
import { getStarCounts, batchLoop } from "./starpuller.mjs"

function byId(string) { return document.getElementById(string) }
const logoutButton = byId("logoutButton")
const loginButton = byId("loginButton")
// const allStarsDiv = byId("allStars")
const status = byId("status")
const repoInput = byId("repo")
const similarDiv = byId("similar")

function updateLoginButton() {
    if (window.localStorage.getItem("token")) {
        loginButton.style.display = 'none'
        logoutButton.style.display = ''
    } else {
        loginButton.style.display = ''
        logoutButton.style.display = 'none'
    }
}
updateLoginButton()

function logout() {
    localStorage.removeItem("token")
    updateLoginButton()
}
byId("logoutButton").onclick = logout

function getCountOf(array) {
    var unsorted = {}
    array.forEach(val => unsorted[val] = (unsorted[val] || 0) + 1)
    return Object.entries(unsorted).sort(([, v1], [, v2]) => v2 - v1)
}

function logger() {
    const div = document.createElement("div")
    div.innerText = JSON.stringify(Object.values(arguments))
    status.appendChild(div)
}

async function asyncMap(arr, f) {
    return await Promise.all(arr.map(f))
}

async function doRepo() {
    const repo = repoInput.value
    logger("Getting stargazers of repo")
    await batchLoop([repo], 'stargazers', 50, logger)
    logger("Got stargazers of repo")
    // if (!collector[repo].failed) {
    const repo_items = (await localforage.getItem(repo)).items
    logger(`Getting stars of ${repo_items.length} stargazers`)
    await batchLoop(repo_items, 'stars', 50, logger)
    logger("Got stars of stargazers")
    // }
    const itemsOf = async (user) => {
        const lfUser = await localforage.getItem(user)
        if (!lfUser) {
            // logger(`user ${user} is missing`)
            return []
        }
        return lfUser.items
    }
    const countOf = getCountOf((await asyncMap(repo_items, itemsOf)).flat())
    const goodCountOf = countOf.filter(([, val]) => val > 3)
    const costarredRepos = goodCountOf.map(([key,]) => key)
    logger(`Getting stargazer counts of ${costarredRepos.length} costarred repos.`)
    await getStarCounts(costarredRepos, 50, logger)
    const weightedCountOf = (await asyncMap(goodCountOf, async ([repo, count]) => [repo, count > 3 ? count / (await localforage.getItem(repo)).stargazerCount : -1]))
        .sort(([, v1], [, v2]) => v2 - v1)
    // logger("goodCountOf:", goodCountOf)
    // logger("weightedCountOf:", weightedCountOf)
    similarDiv.innerText = JSON.stringify(weightedCountOf.slice(0, 100).map(([repo,]) => repo))
}
byId("doRepo").onclick = doRepo
