import { AceBase } from 'acebase'
import { createReadStream, appendFileSync } from 'fs'
import { createInterface } from 'readline'
// const db = new AceBase('mydb', { logLevel: 'error' }) // Creates or opens a database with name "mydb"

const n = 500_000

const numStargazerRows = 3_139_019
const numStarsRows = 3_032_978
const path = '/Users/l/Downloads/github-data'
const idMap: Map<string, number> = new Map()
const nameMap: Map<number, string> = new Map()

function log(...args: unknown[]): void {
    console.log(new Date().toLocaleString(), ...args)
    appendFileSync(
        'log.txt',
        JSON.stringify([new Date().toLocaleString(), ...args])
    )
}

void main()
async function main() {
    if (!process.argv[2]) throw Error('must say what kind')

    log('APPROACH:', process.argv[2])
    const start = Date.now()
    // await db.ready()
    // log('db is ready')
    // log('loading stars:')
    // await loadStars()
    // log('done loading stars\n\n\n\n\n')
    log('loading gazers:')
    await loadGazers(n)
    log('done loading gazers\n\n\n\n\n')
    const end = Date.now()
    log('duration:', end - start)
    log('n was', n)
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    log(`The script uses approximately ${Math.round(used * 100) / 100} MB`)
}

type MaybeAsync<T> = T extends (...args: infer In) => infer Out
    ? T | ((...args: In) => Promise<Out>)
    : never

async function loadStars() {
    const giantObj: Record<string, string[]> = {}
    await processLines(path + '/stars.tsv', (line, num) => {
        if (num % 10000 === 0) {
            log('on line', frac(num, numStarsRows))
        }
        const cols = line.split('\t')
        const user = cols[0]
        const stars = cols.slice(1).map(repo => repo.replace('/', '!!'))
        giantObj[user] = stars
        // void db.ref(`stars/${user}`).set(stars)
    })
    log('putting in database:')
    // await db.ref('stars').set(giantObj)
}
async function loadGazers(n = -1) {
    // let giantObj: Map<string, string[]> = new Map()
    let giantObj: Map<number, number[]> = new Map()

    // const giantObj: Record<string, string[]> = {}
    // const giantObj: Record<number, number[]> = {}

    await processLines(
        path + '/stargazers.tsv',
        async (line, num) => {
            if (num % 10_000 === 0) {
                log('on line', frac(num, numStargazerRows))
                // log('number of keys:', Object.keys(giantObj).length)
            }
            if (num % 10_000 === 0) {
                // log('putting batch in database:')
                // await db.ref('gazers').update(giantObj)
                // log('making new obj hopefully')
                // giantObj = {}
            }
            const cols = line.split('\t')
            const numCols = cols.map(c => idOf(c))
            const repo = numCols[0]
            const gazers = numCols.slice(1)
            giantObj.set(repo, gazers)
            // giantObj[repo] = gazers
            // void db.ref(`gazers/${repo}`).set(gazers)
        },
        n
    )
    // await db.ref('gazers').set(giantObj)
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

function frac(num: number, dem: number): string {
    const percent = ((100 * num) / dem).toFixed(2)
    return `${num.toLocaleString()}/${dem.toLocaleString()} (${percent}%)`
}

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

const unused = 33
