// rm -f fill-db.js sqlite.db && tsc fill-db.ts --esModuleInterop && echo 'starting' && node fill-db.js

// const db = new AceBase('mydb', { logLevel: 'error' }) // Creates or opens a database with name "mydb"
import sqlite from 'better-sqlite3'
import { appendFileSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
const db = sqlite('sqlite.db')

const idMap: Map<string, number> = new Map()
const nameMap: Map<number, string> = new Map()

const numStargazerRows = 3_139_019
const numStarsRows = 3_032_978
const path = '/Users/l/Downloads/github-data'

const n = numStargazerRows

function log(...args: unknown[]): void {
    console.log(new Date().toLocaleString(), ...args)
    appendFileSync(
        'log.txt',
        JSON.stringify([new Date().toLocaleString(), ...args])
    )
}

void main()
async function main() {
    log('APPROACH:', process.argv[2])
    const start = Date.now()
    db.prepare(
        `CREATE TABLE stars (
            user INT,
            repo INT
      )`
    ).run()
    const insert = db.prepare(
        'INSERT INTO stars (user, repo) VALUES (@user, @repo)'
    )

    const insertMany = db.transaction(pairs => {
        for (const pair of pairs) insert.run(pair)
    })

    await loadGazers(insertMany, n)
    const end = Date.now()
    log('duration:', end - start)
    log('n was', n)
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    log(`The script uses approximately ${Math.round(used * 100) / 100} MB`)
}

type Pair = { user: number; repo: number }
const progressUpdateSize = 10000
const databaseBatchSize = 10000
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
            const repo = idOf(cols[0])
            for (let i = 1; i < cols.length; i++) {
                pairs.push({ repo, user: idOf(cols[i]) })
            }
        },
        n
    )
}

let id = 0
function idOf(s: string): number {
    if (idMap.has(s)) {
        return idMap.get(s)!
    }
    // const id = (Math.random() * 1_000_000_000) | 0
    id += 1
    idMap.set(s, id)
    nameMap.set(id, s)
    return id
}

// async function loadStars() {
//     // TODO
//     await processLines(path + '/stars.tsv', (line, num) => {
//         const cols = line.split('\t')
//         const user = cols[0]
//         const stars = cols.slice(1)
//     })
// }

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
