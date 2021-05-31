import localforage from "localforage"
const token = localStorage.getItem("token")
const rateLimitQuery = "rateLimit { cost remaining resetAt }"
const failure = Symbol("failure")

function has(object: Record<PropertyKey, unknown>, property: PropertyKey) {
    return Object.prototype.hasOwnProperty.call(object, property)
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

function repoQuery(repo: string, alias = "", cursor = ""): string {
    const [owner, name] = repo.split("/")
    if (cursor) { cursor = `, after: "${cursor}"` }
    if (alias) { alias = `${alias}: ` }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazers(first: 100${cursor}) { edges { cursor node { login } } } }`
}

function userQuery(user: string, alias = "", cursor = ""): string {
    if (cursor) { cursor = `, after: "${cursor}"` }
    if (alias) { alias = `${alias}: ` }
    return `${alias}user(login: "${user}") { starredRepositories(first: 100${cursor}) { edges { cursor node { nameWithOwner } } } }`
}

function stargazerCountQuery(repo: string, alias = ""): string {
    const [owner, name] = repo.split("/")
    if (alias) { alias = `${alias}: ` }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazerCount }`
}


async function runQuery(query: string): Promise<Record<string, any> | typeof failure> {
    console.log("Running query:", query)
    try {
        const response = await fetch("https://api.github.com/graphql", {
            method: 'POST',
            body: JSON.stringify({ query }),
            headers: {
                Authorization: `token ${token}`,
            }
        })
        const json = await response.json()
        return json
    } catch (e) {
        console.error(e)
        return failure
    }
}

function remove<T>(array: T[], item: T): void {
    const i = array.indexOf(item)
    if (i == -1) {
        throw new Error(`remove: ${item} not in ${array}`)
    }
    array.splice(i, 1)
}

const maxStars = 50
const maxStargazers = 100

async function asyncFilter<T>(arr: T[], predicate: (_: T) => Promise<boolean>) {
    const results = await Promise.all(arr.map(predicate))

    return arr.filter((_v, index) => results[index])
}

interface Entry {
    failed: boolean
    done: boolean
    items: string[]
    name: string
    stargazerCount?: number
    lastCursor?: string
}

function makeItemInfo(name: string): Entry {
    return { failed: false, done: false, items: [], name, stargazerCount: undefined }
}

const uids: { [k: string]: string } = {}
function uidOf(s: string): string {
    if (!has(uids, s)) { uids[s] = makeUid() }
    return uids[s]
}

// TODO: mode for getting the stargazer count of many repos
export async function batchLoop(items: string[], mode: "stars" | "stargazers", batchSize = 50): Promise<void> {
    // const item = items[0]
    // TODO: pack variables into objects
    const foo =
        mode == "stars"
            ? {
                part1: "starredRepositories",
                part2: "nameWithOwner",
                makeQuery: userQuery,
                max: maxStars,
            }
            : {
                part1: "stargazers",
                part2: "login",
                makeQuery: repoQuery,
                max: maxStargazers,
            }
    console.log("unfiltered items:", items)
    items = await asyncFilter(items, async (item) => {
        const lfi = await localforage.getItem(item) as Entry
        return lfi == null || lfi.done != true
    })
    console.log("filtered items:", items)
    // const uidOf = makeDefaultDict(makeUid)
    // const uidOf = (s: string) => has(uids, s) ? uids[s] : 
    const cursors: { [key: string]: string } = {}
    const currentItems = items.slice(items.length - batchSize)
    let pointer = currentItems.length
    for (const item of items) {
        const x = await localforage.getItem(item) as Entry
        if (x.lastCursor) { cursors[item] = x.lastCursor }
    }
    while (currentItems.length > 0) {
        // TODO: save last cursor as you go, and restart from last cursor if possible
        // TODO maybe: use sets so you never get duplicate entries in star list.
        // TODO: use promises or async or whatever
        const queryParts = currentItems.map(item => foo.makeQuery(item, uidOf(item), cursors[item]))
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error("query failed")
            // TODO: retry it or something?
            break
        }
        for (const item of [...currentItems]) {
            let coll_i = await localforage.getItem(item) as Entry | null
            if (coll_i == null) {
                coll_i = makeItemInfo(item)
            }

            const uid = uidOf(item)
            if (!has(result["data"], uid)) {
                console.log(`Dropping item ${item} because it caused errors`)
                remove(currentItems, item)
                coll_i.done = true
                coll_i.failed = true
                await localforage.setItem(item, coll_i)
                continue
            }
            const edges = result["data"][uid][foo.part1]["edges"]
            edges.forEach((e: any) => coll_i!.items.push(e['node'][foo.part2]))
            if (edges.length < 100 || coll_i.items.length >= foo.max) {
                remove(currentItems, item)
                coll_i.done = true
                console.log(`Finished item "${item}". There are ${currentItems.length} currentItems and ${items.length - pointer} left after that.`)
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

export async function getStarCounts(items: string[], batchSize = 200): Promise<void> {
    items = await asyncFilter(items, async (item: string) => {
        const entry = await localforage.getItem(item) as Entry
        return entry == null || entry.stargazerCount == null
    })
    for (let pointer = 0; pointer < items.length; pointer += batchSize) {
        console.log(`Getting stargazer counts ${pointer}:${pointer + batchSize} out of ${items.length}`)
        const currentItems = items.slice(pointer, pointer + batchSize)
        const queryParts = currentItems.map(item => stargazerCountQuery(item, uidOf(item)))
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error("query failed")
            break
        }
        for (const item of [...currentItems]) {
            // TODO: Could be in a separate table for faster read/write
            let coll_i = await localforage.getItem(item) as Entry | null
            if (coll_i == null) {
                coll_i = makeItemInfo(item)
            }
            const uid = uidOf(item)
            if (!has(result["data"], uid)) {
                console.log(`Item ${item} caused errors`)
                continue
            }
            coll_i.stargazerCount = result["data"][uid]["stargazerCount"]
            await localforage.setItem(item, coll_i)
        }
    }
    return
}


function getCountOf(array: string[]): [string, number][] {
    const unsorted: { [k: string]: number } = {}
    array.forEach(val => unsorted[val] = (unsorted[val] || 0) + 1)
    // var sorted = {}
    return Object.entries(unsorted).sort(([, v1], [, v2]) => v2 - v1)
    // return sorted
}

async function asyncMap<T, S>(arr: T[], f: (t: T) => Promise<S>): Promise<S[]> {
    return await Promise.all(arr.map(f))
}

// let collector = makeDefaultDict((name) => { return { failed: false, done: false, items: [], name: name } })
export async function doRepo(repo: string): Promise<string> {
    console.log("Getting stargazers of repo")
    await batchLoop([repo], 'stargazers')
    console.log("Got stargazers of repo")
    // if (!collector[repo].failed) {
    const repo_items = (await localforage.getItem(repo) as Entry).items
    console.log(`Getting stars of ${repo_items.length} stargazers`)
    await batchLoop(repo_items, 'stars')
    console.log("Got stars of stargazers")
    // }
    // TODO:
    console.log("Getting stargazer counts of costarred repos.")
    const itemsOf = async (user: string) => (await localforage.getItem(user) as Entry).items
    const countOf = getCountOf((await asyncMap(repo_items, itemsOf)).flat())
    const goodCountOf = countOf.filter(([, val]) => val > 3)
    await getStarCounts(goodCountOf.map(([key,]) => key))
    const weightedCountOf = (await asyncMap(goodCountOf, async ([repo, count]) => [repo, count > 3 ? count / (await localforage.getItem(repo) as Entry).stargazerCount! : -1]))
        .sort(([, v1], [, v2]) => (v2 as number) - (v1 as number))
    console.log("goodCountOf:", goodCountOf)
    console.log("weightedCountOf:", weightedCountOf)
    return JSON.stringify(weightedCountOf.slice(0, 100).map(([repo,]) => repo))
}
