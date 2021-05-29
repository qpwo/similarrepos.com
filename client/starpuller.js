"use strict"
const token = localStorage.getItem("token")
const rateLimitQuery = "rateLimit { cost remaining resetAt }"

function has(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property)
}

function makeDefaultDict(factory) {
    return new Proxy({}, {
        get(target, name) {
            if (!(has(target, name))) {
                target[name] = factory(name)
            }
            return target[name]
        }
    })
}

function makeUid() {
    return Math.random().toString(36).substring(7)
}

function repoQuery(repo, alias = "", cursor = "") {
    const [owner, name] = repo.split("/")
    if (cursor) { cursor = `, after: "${cursor}"` }
    if (alias) { alias = `${alias}: ` }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazers(first: 100${cursor}) { edges { cursor node { login } } } }`
}

function userQuery(user, alias = "", cursor = "") {
    if (cursor) { cursor = `, after: "${cursor}"` }
    if (alias) { alias = `${alias}: ` }
    return `${alias}user(login: "${user}") { starredRepositories(first: 100${cursor}) { edges { cursor node { nameWithOwner } } } }`
}


async function runQuery(query) {
    console.log("Running query:", query)
    const response = await fetch("https://api.github.com/graphql", {
        method: 'POST',
        body: JSON.stringify({ query: query }),
        headers: {
            Authorization: "token " + token,
        }
    })
    const json = await response.json()
    return json
}

async function batchLoop(items, mode, collector, batch_size = 100) {
    const item = items[0]
    let part1, part2, makeQuery
    if (mode == "stars") {
        part1 = "starredRepositories"
        part2 = "nameWithOwner"
        makeQuery = userQuery
    } else if (mode == "stargazers") {
        part1 = "stargazers"
        part2 = "login"
        makeQuery = repoQuery
    } else {
        throw new Error()
    }
    const uid_of = makeDefaultDict(makeUid)
    let cursors = {}
    while (true) {
        // TODO: use promises or async or whatever
        let queryPart = makeQuery(item, uid_of[item], cursors[item])
        let query = `{ ${queryPart} ${rateLimitQuery} }`
        const result = await runQuery(query)
        const uid = uid_of[item]
        const edges = result["data"][uid][part1]["edges"]
        if (edges.length < 100) {
            collector[item].done = true
            break
        }
        cursors[item] = edges[edges.length - 1]["cursor"]
        edges.forEach(e => collector[item].items.push(e['node'][part2]))
    }
    return
}
