"use strict"

import localforage from "./localforage.js"

const token = localStorage.getItem("token")
const rateLimitQuery = "rateLimit { cost remaining resetAt }"
const failure = Symbol("failure")

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

function stargazerCountQuery(repo, alias = "") {
    const [owner, name] = repo.split("/")
    if (alias) { alias = `${alias}: ` }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazerCount }`
}


async function runQuery(query) {
    // console.log("Running query:", query)
    try {
        const response = await fetch("https://api.github.com/graphql", {
            method: 'POST',
            body: JSON.stringify({ query: query }),
            headers: {
                Authorization: "token " + token,
            }
        })
        const json = await response.json()
        return json
    } catch (e) {
        console.error(e)
        return failure
    }
}

function remove(array, item) {
    const i = array.indexOf(item)
    if (i == -1) {
        throw new Error(`remove: ${item} not in ${array}`)
    }
    array.splice(i, 1)
}

const asyncFilter = async (arr, predicate) => {
    const results = await Promise.all(arr.map(predicate))

    return arr.filter((_v, index) => results[index])
}

const maxStars = 100
const maxStargazers = 500

function makeItemInfo(name) {
    return { failed: false, done: false, items: [], name: name, stargazerCount: null }
}

// TODO: mode for getting the stargazer count of many repos
export async function batchLoop(items, mode, batchSize, logger) {
    // const item = items[0]
    // TODO: pack variables into objects
    let part1, part2, makeQuery, max
    if (mode == "stars") {
        part1 = "starredRepositories"
        part2 = "nameWithOwner"
        makeQuery = userQuery
        max = maxStars
    } else if (mode == "stargazers") {
        part1 = "stargazers"
        part2 = "login"
        makeQuery = repoQuery
        max = maxStargazers
    } else {
        throw new Error()
    }
    // console.log("unfiltered items:", items)
    items = await asyncFilter(items, async (item) => {
        const lfi = await localforage.getItem(item)
        return lfi == null || lfi.done != true
    })
    // console.log("filtered items:", items)
    const uidOf = makeDefaultDict(makeUid)
    let cursors = {}
    let currentItems = items.slice(items.length - batchSize)
    let pointer = currentItems.length
    for (const item of items) {
        const x = await localforage.getItem(item)
        cursors[item] = x ? x.lastCursor : undefined
    }
    while (currentItems.length > 0) {
        // TODO: save last cursor as you go, and restart from last cursor if possible
        // TODO maybe: use sets so you never get duplicate entries in star list.
        // TODO: use promises or async or whatever
        logger(`Completed ${pointer - currentItems.length} out of ${items.length}`)
        const queryParts = currentItems.map(item => makeQuery(item, uidOf[item], cursors[item]))
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error("query failed")
            // TODO: retry it or something?
            break
        }
        for (const item of [...currentItems]) {
            let coll_i = await localforage.getItem(item)
            if (coll_i == null) {
                coll_i = makeItemInfo(item)
            }

            const uid = uidOf[item]
            if (!result?.data?.[uid]) {
                // if (!has(result["data"], uid)) {
                logger(`Dropping item ${item} because it caused errors`)
                remove(currentItems, item)
                coll_i.done = true
                coll_i.failed = true
                await localforage.setItem(item, coll_i)
                continue
            }
            const edges = result["data"][uid][part1]["edges"]
            edges.forEach(e => coll_i.items.push(e['node'][part2]))
            if (edges.length < 100 || coll_i.items.length >= max) {
                remove(currentItems, item)
                coll_i.done = true
                // console.log(`Finished item "${item}". There are ${currentItems.length} currentItems and ${items.length - pointer} left after that.`)
                // NOTE: if this was async generator then we could yield item here.
            } else {
                const cursor = edges[edges.length - 1]["cursor"]
                cursors[item] = cursor
                coll_i.lastCursor = cursor
            }
            await localforage.setItem(item, coll_i)
        }
        if (currentItems.length < batchSize && pointer < items.length) {
            const addCount = Math.min(batchSize - currentItems.length, items.length - pointer)
            currentItems.push(...items.slice(pointer, pointer + addCount))
            pointer += addCount
        }
    }
    return
}

export async function getStarCounts(items, batchSize, logger) {
    items = await asyncFilter(items, async (item) => {
        const lfi = await localforage.getItem(item)
        return lfi == null || lfi.stargazerCount == null
    })
    const uidOf = makeDefaultDict(makeUid)
    for (let pointer = 0; pointer < items.length; pointer += batchSize) {
        logger(`Getting stargazer counts ${pointer}:${pointer + batchSize} out of ${items.length}`)
        let currentItems = items.slice(pointer, pointer + batchSize)
        const queryParts = currentItems.map(item => stargazerCountQuery(item, uidOf[item]))
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error("query failed")
            break
        }
        for (const item of [...currentItems]) {
            // TODO: Could be in a separate table for faster read/write
            let coll_i = await localforage.getItem(item)
            if (coll_i == null) {
                coll_i = makeItemInfo(item)
            }
            const uid = uidOf[item]
            if (!has(result["data"], uid)) {
                logger(`Item ${item} caused errors`)
                continue
            }
            coll_i.stargazerCount = result["data"][uid]["stargazerCount"]
            await localforage.setItem(item, coll_i)
        }
    }
    return
}
