// rm -f fill-db.js && tsc fill-db.ts --esModuleInterop && echo 'starting' && node fill-db.js
// also: node --max-old-space-size=12000
// const db = new AceBase('mydb', { logLevel: 'error' }) // Creates or opens a database with name "mydb"
import sqlite from 'better-sqlite3'
import { appendFileSync, createReadStream } from 'fs'
import { createInterface } from 'readline'

import { sql } from './util'

const db = sqlite('sqlite.db')

const userIdMap: Map<string, number> = new Map()
const repoIdMap: Map<string, number> = new Map()

const ten17 = 10 ** 17
const numStargazerRows = 3_139_019
const path = '/Users/l/Downloads/github-data'

const n = numStargazerRows
makeIdxs()
function makeIdxs() {
    // log('making userStarIdx...')
    // db.prepare(`CREATE INDEX userStarIdx ON stars (userId);`).run()

    // log('making repoStarIdx...')
    // db.prepare(`CREATE INDEX repoStarIdx ON stars (repoId);`).run()

    // log('making reponameIdx...')
    // db.prepare(`CREATE UNIQUE INDEX reponameIdx ON repoIds (repoName);`).run()

    // log('making repoidIdx...') // apparently this one isn't unique lol
    // db.prepare(`CREATE  INDEX repoidIdx ON repoIds (repoId);`).run()

    // log('making usernameIdx...')
    // db.prepare(`CREATE UNIQUE INDEX usernameIdx ON userIds (userName);`).run()

    log('making useridIdx...')
    db.prepare(`CREATE  INDEX useridIdx ON userIds (userId);`).run()
}
export function log(...args: unknown[]): void {
    console.log(new Date().toLocaleString(), memoryUsed(), ...args)
    appendFileSync(
        'log.txt',
        JSON.stringify([new Date().toLocaleString(), memoryUsed(), ...args]) +
            '\n'
    )
}

// void main()
async function _main() {
    log('\n\n\nAPPROACH:', process.argv[2])
    const start = Date.now()
    db.prepare(
        sql`CREATE TABLE stars (
            userId INT NOT NULL,
            repoId INT NOT NULL
      )`
    ).run()
    db.prepare(
        sql`CREATE TABLE repoIds (
            repoName VARCHAR(50) NOT NULL,
            repoId INT NOT NULL
            -- FOREIGN KEY (repoId) REFERENCES stars(repoId)
      )`
    ).run()
    db.prepare(
        sql`CREATE TABLE userIds (
            userName VARCHAR(50) NOT NULL,
            userId INT NOT NULL
            -- FOREIGN KEY (userId) REFERENCES stars(userId)
      )`
    ).run()

    const insertStar = db.prepare(
        sql`INSERT INTO stars (userId, repoId) VALUES (?, ?)`
    )
    const insertStars = db.transaction((pairs: [number, number][]) => {
        for (const pair of pairs) insertStar.run(pair)
    })

    log('loading all gazers')
    await loadGazers(insertStars, n)

    const insertRepo = db.prepare(
        sql`INSERT INTO repoIds (repoName, repoId) VALUES (?, ?)`
    )
    const insertRepos = db.transaction((pairs: [string, number][]) => {
        for (const p of pairs) insertRepo.run(p)
    })
    const insertUser = db.prepare(
        sql`INSERT INTO userIds (userName, userId) VALUES (?, ?)`
    )
    const insertUsers = db.transaction((pairs: [string, number][]) => {
        for (const p of pairs) insertUser.run(p)
    })

    // log('inserting names in batches')
    // const pairs: { id: number; string: string }[] = []
    log('inserting repos')
    insertRepos(Array.from(repoIdMap.entries()))
    log('inserting users')
    insertUsers(Array.from(userIdMap.entries()))
    // idMap.forEach((val, key) => {
    //     pairs.push({ id: val, string: key })
    // })

    // insertNames(pairs)
    const end = Date.now()
    log('duration:', end - start)
    log('n was', n)
    log(`The script uses approximately ${memoryUsed()}`)
}

// type Pair = { user: number; repo: number }
type Pair = [number, number] // [user, repo]
const progressUpdateSize = 100_000
const databaseBatchSize = 100_000
function memoryUsed() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    return `${Math.round(used * 100) / 100} MB`
}

async function loadGazers(insertMany: (ps: Pair[]) => void, n = -1) {
    let pairs: Pair[] = []
    await processLines(
        path + '/stargazers.tsv',
        (line, num) => {
            if (num % progressUpdateSize === 0) {
                log('on line', frac(num, numStargazerRows))
            }
            if (num % databaseBatchSize === 0) {
                const before = Date.now()
                insertMany(pairs)
                const after = Date.now()
                const secondsElapsed = (after - before) / 1000
                log(
                    `inserting ${pairs.length} pairs took ${secondsElapsed} seconds`
                )
                pairs = []
            }
            const cols = line.split('\t')
            const repo = repoId(cols[0])
            for (let i = 1; i < cols.length; i++) {
                pairs.push([userId(cols[i]), repo])
            }
        },
        n
    )
    log(`inserting last ${pairs.length} pairs`)
    insertMany(pairs)
}

function repoId(s: string): number {
    if (repoIdMap.has(s)) return repoIdMap.get(s)!
    const id = makeId()
    repoIdMap.set(s, id)
    return id
}

function userId(s: string): number {
    if (userIdMap.has(s)) return userIdMap.get(s)!
    const id = makeId()
    userIdMap.set(s, id)
    return id
}

function makeId(): number {
    return (Math.random() * ten17) | 0
}

function frac(num: number, dem: number): string {
    const percent = ((100 * num) / dem).toFixed(2)
    return `${num.toLocaleString()}/${dem.toLocaleString()} (${percent}%)`
}

type MaybeAsync<T> = T extends (...args: infer In) => infer Out
    ? T | ((...args: In) => Promise<Out>)
    : never

async function processLines(
    filename: string,
    handleLine: MaybeAsync<(s: string, lineNo: number) => void>,
    maxCount = -1
) {
    const fileStream = createReadStream(filename)

    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    })
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    let count = 0
    for await (const line of rl) {
        count += 1
        if (maxCount > 0 && count > maxCount) {
            break
        }
        // Each line in input.txt will be successively available here as `line`.
        await handleLine(line, count)
    }
}
