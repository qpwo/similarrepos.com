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

function log(message) {
    const div = document.createElement("div")
    div.innerText = message
    status.appendChild(div)
}

async function asyncMap(arr, f) {
    return await Promise.all(arr.map(f))
}

async function doRepo() {
    const repo = repoInput.value
    log("Getting stargazers of repo")
    await batchLoop([repo], 'stargazers')
    log("Got stargazers of repo")
    // if (!collector[repo].failed) {
    const repo_items = (await localforage.getItem(repo)).items
    log(`Getting stars of ${repo_items.length} stargazers`)
    await batchLoop(repo_items, 'stars')
    log("Got stars of stargazers")
    // }
    log("Getting stargazer counts of costarred repos.")
    const countOf = getCountOf((await asyncMap(repo_items, itemsOf)).flat())
    const goodCountOf = countOf.filter(([, val]) => val > 3)
    await getStarCounts(goodCountOf.map(([key,]) => key))
    const weightedCountOf = (await asyncMap(goodCountOf, async ([repo, count]) => [repo, count > 3 ? count / (await localforage.getItem(repo)).stargazerCount : -1]))
        .sort(([k1, v1], [k2, v2]) => v2 - v1)
    log("goodCountOf:", goodCountOf)
    log("weightedCountOf:", weightedCountOf)
    similarDiv.innerText = JSON.stringify(weightedCountOf.slice(0, 100).map(([repo,]) => repo))
}
byId("doRepo").onclick = doRepo
