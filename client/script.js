"use strict"
function qs(string) { return document.querySelector(string) }
const loginHolder = qs("#loginHolder")
const logoutButton = qs("#logoutButton")
const loginButton = qs("#loginButton")
const allStarsDiv = qs("#allStars")
const repoInput = qs("#repo")
const similarDiv = qs("#similar")

function updateLoginButton() {
    while (loginHolder.firstChild) {
        loginHolder.firstChild.remove()
    } if (window.localStorage.getItem("token") == null) {
        loginHolder.appendChild(loginButton)
    } else {
        loginHolder.appendChild(logoutButton)
    }
}
updateLoginButton()

function logout() {
    localStorage.removeItem("token")
    updateLoginButton()
}

async function asyncMap(arr, f) {
    return await Promise.all(arr.map(f))
}

function getCountOf(array) {
    var unsorted = {}
    array.forEach(val => unsorted[val] = (unsorted[val] || 0) + 1)
    // var sorted = {}
    return Object.entries(unsorted).sort(([k1, v1], [k2, v2]) => v2 - v1)
    // return sorted
}

// let collector = makeDefaultDict((name) => { return { failed: false, done: false, items: [], name: name } })
async function doRepo() {
    const repo = repoInput.value
    console.log("Getting stargazers of repo")
    await batchLoop([repo], 'stargazers')
    console.log("Got stargazers of repo")
    // if (!collector[repo].failed) {
    const repo_items = (await localforage.getItem(repo)).items
    console.log(`Getting stars of ${repo_items.length} stargazers`)
    await batchLoop(repo_items, 'stars')
    console.log("Got stars of stargazers")
    // }
    // TODO:
    console.log("Getting stargazer counts of costarred repos.")
    const itemsOf = async (user) => (await localforage.getItem(user)).items
    const countOf = getCountOf((await asyncMap(repo_items, itemsOf)).flat())
    await getStarCounts(countOf.map(([key, val]) => key))
    const weightedCountOf = (await asyncMap(countOf, async ([repo, count]) => [repo, count > 3 ? count / (await localforage.getItem(repo)).stargazerCount : -1]))
        .sort(([k1, v1], [k2, v2]) => v2 - v1)
    console.log("countOf:", countOf)
    console.log("weightedCountOf:", weightedCountOf)
    similarDiv.innerText = JSON.stringify(weightedCountOf.slice(0, 100).map(([repo, score]) => repo))
}
