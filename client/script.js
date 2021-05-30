"use strict"
function qs(string) { return document.querySelector(string) }
const loginHolder = qs("#loginHolder")
const logoutButton = qs("#logoutButton")
const loginButton = qs("#loginButton")
const allStarsDiv = qs("#allStars")
const repoInput = qs("#repo")

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

let collector = makeDefaultDict((name) => { return { failed: false, done: false, items: [], name: name } })
async function doRepo() {
    const repo = repoInput.value
    console.log("Getting stargazers of repo")
    await batchLoop([repo], 'stargazers', collector)
    console.log("Got stargazers of repo")
    if (!collector[repo].failed) {
        console.log(`Getting stars of ${collector[repo].items.length} stargazers`)
        await batchLoop(collector[repo].items, 'stars', collector)
        console.log("Got stars of stargazers")
    }
    // TODO:
    // console.log("Got stars of stargazers. Getting stargazer counts of costarred repos.")
}
