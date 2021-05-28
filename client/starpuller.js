"use strict"
const token = localStorage.getItem("token")
const rateLimitQuery = "rateLimit { cost remaining resetAt }"

function makeDefaultDict(factory) {
    return new Proxy({}, {
        get(target, name) {
            if (!(name in target)) {
                target[name] = factory()
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

function batchLoop(items, mode, batch_size = 100) {
    const item = items[0]
    collector = dict()
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
    uid_of = makeDefaultDict(makeUid)
    cursors = {}
    let edges = []
    let things = []
    do {
        // TODO: use promises or async or whatever
        let queryPart = makeQuery(item, uid_of[item], cursor[item])
        let query = `{ ${queryPart} ${rateLimitQuery} }`
        const result = run_query(query)
        const uid = uid_of[item]
        edges = result["data"][uid][part1]["edges"]
        things.forEach(e => thing.push(e['node'][part2]))
    } while (len(edges) >= 100)
    return things
}
