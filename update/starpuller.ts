#! esbuild --bundle --platform=node update/starpuller.ts --sourcemap  --outfile=build.js && node build.js

'use strict'

import { memoize } from 'lodash'
import fetch from 'node-fetch'
// import tokens from '../ignore/tokens.json'

// const token = tokens[0]
const token = ''

// declare const brand: unique symbol
// type Brand<K, T> = K & { readonly ___: T }
// type Repo = Brand<string, 'Repo'>
// type User = Brand<string, 'User'>
type Repo = string & { ___?: 'repo' }
type User = string & { ___?: 'user' }

// import { ClassicLevel } from 'classic-level'
// const db_ = new ClassicLevel('db', { valueEncoding: 'json' })
// const starsdb = db_.sublevel<User, Repo[]>('stars', { valueEncoding: 'json' })
// const gazersdb = db_.sublevel<Repo, User[]>('gazers', { valueEncoding: 'json' })

const rateLimitQuery = 'rateLimit { cost remaining resetAt }'
const failure = Symbol('failure')

function has(object: {}, property: string) {
    return Object.prototype.hasOwnProperty.call(object, property)
}

function repoQuery(repo: string, alias = '', cursor = '') {
    const [owner, name] = repo.split('/')
    if (cursor) {
        cursor = `, after: "${cursor}"`
    }
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazers(first: 100${cursor}) { edges { cursor node { login } } } }`
}

function userQuery(user: string, alias = '', cursor = '') {
    if (cursor) {
        cursor = `, after: "${cursor}"`
    }
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}user(login: "${user}") { starredRepositories(first: 100${cursor}) { edges { cursor node { nameWithOwner } } } }`
}

function stargazerCountQuery(repo: string, alias = '') {
    const [owner, name] = repo.split('/')
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazerCount }`
}

async function runQuery(query: string): Promise<any | typeof failure> {
    // console.log("Running query:", query)
    try {
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            body: JSON.stringify({ query }),
            headers: {
                Authorization: 'token ' + token,
            },
        })
        const json = await response.json()
        return json
    } catch (e) {
        console.error(e)
        return failure
    }
}

function remove<T>(array: T[], item: T) {
    const i = array.indexOf(item)
    if (i == -1) {
        throw new Error(`remove: ${item} not in ${array}`)
    }
    array.splice(i, 1)
}

async function asyncFilter<T>(arr: T[], predicate: (t: T) => Promise<boolean>) {
    const results = await Promise.all(arr.map(predicate))

    return arr.filter((_v, index) => results[index])
}

const maxStars = 10
const maxStargazers = 10

export type ItemInfo = {
    failed: boolean
    done: boolean
    items: string[]
    name: string
    stargazerCount: null | number
    lastCursor?: string
}

type Source = string & { __?: undefined }
type Target = string & { __?: undefined }
export async function getAllEdges(
    mode: 'stars' | 'gazers',
    items: Source[],
    batchSize: number,
    logger: (s: string) => void
): Promise<{ results: Record<Source, Target[]>; failures: Source[] }> {
    const [part1, part2, makeQuery, max] =
        mode == 'stars'
            ? ['starredRepositories', 'nameWithOwner', userQuery, maxStars]
            : ['stargazers', 'login', repoQuery, maxStargazers]

    // MARK: could filter out recently-fetched items here

    const targetsOf: Record<Source, Target[]> = {}
    items.forEach(item => (targetsOf[item] = []))
    const failures: Source[] = []
    const cursors: Record<Source, string | undefined> = {}
    const currentSources = new Set(items.slice(items.length - batchSize))
    let pointer = currentSources.size
    while (currentSources.size > 0) {
        logger(
            `Completed ${pointer - currentSources.size} out of ${items.length}`
        )
        const queryParts = [...currentSources].map(item =>
            makeQuery(item, uidOf(item), cursors[item])
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const item of [...currentSources]) {
            const uid = uidOf(item)
            if (!result?.data?.[uid]) {
                logger(
                    `Dropping item ${item} because it caused errors: ${JSON.stringify(
                        result
                    )}`
                )
                currentSources.delete(item)
                failures.push(item)
                continue
            }
            const edges = result['data'][uid][part1]['edges']
            edges.forEach((e: any) => targetsOf[item].push(e['node'][part2]))
            if (edges.length < 100 || targetsOf[item].length >= max) {
                currentSources.delete(item)
            } else {
                const cursor = edges[edges.length - 1]['cursor']
                cursors[item] = cursor
                // MARK: could save lastCursor here. lastCursor = cursor
            }
        }
        if (currentSources.size < batchSize && pointer < items.length) {
            const addCount = Math.min(
                batchSize - currentSources.size,
                items.length - pointer
            )
            items
                .slice(pointer, pointer + addCount)
                .forEach(item => currentSources.add(item))
            pointer += addCount
        }
    }
    return { results: targetsOf, failures }
}
/*
export async function getStarCounts(
    items: string[],
    batchSize: number,
    logger: (s: string) => void
) {
    items = await asyncFilter(items, async item => {
        const lfi = (await localForage.getItem(item)) as ItemInfo
        return lfi == null || lfi.stargazerCount == null
    })
    const uidOf = makeDefaultDict(makeUid)
    for (let pointer = 0; pointer < items.length; pointer += batchSize) {
        logger(
            `Getting stargazer counts ${pointer}:${
                pointer + batchSize
            } out of ${items.length}`
        )
        const currentItems = items.slice(pointer, pointer + batchSize)
        const queryParts = currentItems.map(item =>
            stargazerCountQuery(item, uidOf(item))
        )
        const query = `{ ${queryParts.join('\n')}\n ${rateLimitQuery} }`
        const result = await runQuery(query)
        if (result === failure) {
            console.error('query failed')
            break
        }
        for (const item of [...currentItems]) {
            // TODO: Could be in a separate table for faster read/write
            const coll_i: ItemInfo =
                (await localForage.getItem(item)) ?? makeItemInfo(item)
            const uid = uidOf(item)
            if (!has(result['data'], uid)) {
                logger(`Item ${item} caused errors`)
                continue
            }
            coll_i.stargazerCount = result['data'][uid]['stargazerCount']
            await localForage.setItem(item, coll_i)
        }
    }
}
 */
const uidOf = memoize((s: string) => 'a' + Math.random().toString().slice(2))

async function test() {
    const out = await getAllEdges(
        'gazers',
        ['preactjs/preact'],
        10,
        console.log
    )
    console.log(out)
    console.log(JSON.stringify(out))
}

void test()
