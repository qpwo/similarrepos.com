"use strict"
function qs(string) { return document.querySelector(string) }
const login_holder = qs("#login_holder")
const logout_button = qs("#logout_button")
const login_button = qs("#login_button")
const all_stars_div = qs("#all_stars")

function updateLoginButton() {
    while (login_holder.firstChild) {
        login_holder.firstChild.remove()
    } if (window.localStorage.getItem("token") == null) {
        login_holder.appendChild(login_button)
    } else {
        login_holder.appendChild(logout_button)
    }
}

updateLoginButton()

function logout() {
    localStorage.removeItem("token")
    updateLoginButton()
}

let collector = makeDefaultDict((name) => { return { failed: false, done: false, items: [], name: name } })

const someRepos = ["grovesNL", "doppioandante", "anderejd", "fkaa", "doppioslash", "rukai", "nickkuk", "non-descriptive", "ozkriff", "natpbs", "kocsis1david", "kooparse", "phrohdoh", "MarkMcCaskey", "ryanrightmer", "jplatte", "Pacoup", "ColinKinloch", "milkowski", "attliaLin", "bwasty", "mitchmindtree", "unrelentingtech", "khernyo", "danaugrs", "Hossein-Noroozpour", "Atul9", "maeln", "xgalaxy", "rroohhh", "simonrepp", "adamnemecek", "kubo39"]
batchLoop(someRepos, 'stars', collector).then(() => all_stars_div.innerHTML = "all done!")
