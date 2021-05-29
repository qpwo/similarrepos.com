"use strict"
function qs(string) { return document.querySelector(string) }
const loginHolder = qs("#loginHolder")
const logoutButton = qs("#logoutButton")
const loginButton = qs("#loginButton")
const allStarsDiv = qs("#allStars")

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

const someRepos = ["grovesNL", "doppioandante", "anderejd", "fkaa", "doppioslash", "rukai", "nickkuk", "non-descriptive", "ozkriff", "natpbs", "kocsis1david", "kooparse", "phrohdoh", "MarkMcCaskey", "ryanrightmer", "jplatte", "Pacoup", "ColinKinloch", "milkowski", "attliaLin", "bwasty", "mitchmindtree", "unrelentingtech", "khernyo", "danaugrs", "Hossein-Noroozpour", "Atul9", "maeln", "xgalaxy", "rroohhh", "simonrepp", "adamnemecek", "kubo39"]
batchLoop(someRepos, 'stars', collector).then(() => allStarsDiv.innerHTML = "all done!")
