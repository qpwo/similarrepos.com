import fetch from 'node-fetch'
import { failure } from './util'

export const rateLimitQuery = 'rateLimit { cost remaining resetAt }'

/** Returns old->new */
export function repoQuery(repo: string, alias = '', cursor = '') {
    const [owner, name] = repo.split('/')
    if (cursor) {
        cursor = `, before: "${cursor}"`
    }
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazers(last: 100${cursor}) { edges { cursor node { login } } } }`
}

/** Returns old->new */
export function userQuery(user: string, alias = '', cursor = '') {
    if (cursor) {
        cursor = `, before: "${cursor}"`
    }
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}user(login: "${user}") { starredRepositories(last: 100${cursor}) { edges { cursor node { nameWithOwner } } } }`
}

export function stargazerCountQuery(repo: string, alias = '') {
    const [owner, name] = repo.split('/')
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazerCount }`
}

export async function runQuery(
    query: string,
    token: string
): Promise<any | typeof failure> {
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
        console.warn('fetch error:', (e as Error).message)
        // console.error(e)
        return failure
    }
}
