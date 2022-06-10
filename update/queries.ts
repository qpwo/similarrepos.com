import fetch from 'node-fetch'
import { failure } from './util'

import tokens from '../ignore/tokens.json'
const token = tokens[0]

export const rateLimitQuery = 'rateLimit { cost remaining resetAt }'

export function repoQuery(repo: string, alias = '', cursor = '') {
    const [owner, name] = repo.split('/')
    if (cursor) {
        cursor = `, after: "${cursor}"`
    }
    if (alias) {
        alias = `${alias}: `
    }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazers(first: 100${cursor}) { edges { cursor node { login } } } }`
}

export function userQuery(user: string, alias = '', cursor = '') {
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

export async function runQuery(query: string): Promise<any | typeof failure> {
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
