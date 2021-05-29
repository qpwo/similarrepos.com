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
    const length = 7
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
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

function remove(array, item) {
    const i = array.indexOf(item)
    if (i == -1) {
        throw new Error(`remove: ${item} not in ${array}`)
    }
    array.splice(i, 1)
}

const maxStars = 500

async function batchLoop(items, mode, collector, batchSize = 100) {
    // const item = items[0]
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
    const uidOf = makeDefaultDict(makeUid)
    let cursors = {}
    let currentItems = items.slice(items.length - batchSize)
    let pointer = currentItems.length
    while (currentItems.length > 0) {
        // TODO: use promises or async or whatever
        const queryParts = currentItems.map(item => makeQuery(item, uidOf[item], cursors[item]))
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query) // TODO: handle failure
        for (const item of [...currentItems]) {
            const uid = uidOf[item]
            if (!has(result["data"], uid)) {
                console.log(`Dropping item ${item} because it caused errors`)
                remove(currentItems, item)
                collector[item].done = true
                collector[item].failed = true
                continue
            }
            const edges = result["data"][uid][part1]["edges"]
            edges.forEach(e => collector[item].items.push(e['node'][part2]))
            if (edges.length < 100 || collector[item].items.length >= maxStars) {
                remove(currentItems, item)
                collector[item].done = true
                console.log(`Finished item "${item}". There are ${currentItems.length} currentItems and ${items.length - pointer} left after that.`)
                // NOTE: if this was async generator then we could yield item here.
            } else {
                cursors[item] = edges[edges.length - 1]["cursor"]
            }
        }
        if (currentItems.length < batchSize && pointer < items.length) {
            const addCount = Math.min(batchSize - currentItems.length, items.length - pointer)
            currentItems.push(...items.slice(pointer, pointer + addCount))
            pointer += addCount
        }
    }
    return
}
