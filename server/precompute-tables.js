const { appendFileSync, createReadStream } = require('fs')
const { createInterface } = require('readline')

const ten17 = 10 ** 17
const numStargazerRows = 3_139_019
const path = '/Users/l/Downloads/github-data'

const gazers = new Map()
const stars = new Map()
const similar = new Map()
const idMap = new Map()
let idCounter = 0
function idOf(x) {
    if (idMap.has(x)) return idMap.get(x)
    idCounter += 1
    idMap.set(x, idCounter)
    return idCounter
}

const n = 40_000
function log(...args) {
    console.log(new Date().toLocaleString(), memoryUsed(), ...args)
    appendFileSync(
        'log.txt',
        JSON.stringify([new Date().toLocaleString(), memoryUsed(), ...args]) +
            '\n'
    )
}

function precomputeSimilar() {
    let i = 0
    for (const r of gazers.keys()) {
        if (i % 100 === 0) {
            log('precomputed', frac(i, gazers.size))
        }
        similar[r] = topSimilar(r)
        i++
    }
}

function topSimilar(repo) {
    const users = gazers.get(repo)
    const counts = {}
    for (const u of users) {
        for (const r of stars.get(u)) {
            counts[r] = (counts[r] ?? 0) + 1
        }
    }
    const entries = Object.entries(counts)
    entries.sort((e1, e2) => e1[1] - e2[1])
    return entries.slice(0, 5).map(e => e[0])
}

void main()
async function main() {
    log('\n\n\nAPPROACH:', process.argv[2], 'n:', n)
    const start = Date.now()
    await loadGazers(n)
    log('done loading gazers precomputing similar')
    precomputeSimilar()
    log('done precomputing. deleting gazers and stars')
    delete gazers
    delete stars
    log('done deleting')
    const end = Date.now()
    log('duration:', end - start)
    log('n was', n)
    log(`The script uses approximately ${memoryUsed()}`)
}

function memoryUsed() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    return `${Math.round(used * 100) / 100} MB`
}

const progressUpdateSize = 10_000
async function loadGazers(n = -1) {
    let pairs = []
    await processLines(
        path + '/stargazers.tsv',
        (line, num) => {
            if (num % progressUpdateSize === 0) {
                log('on line', frac(num, numStargazerRows))
            }
            const cols = line.split('\t').map(idOf)
            const users = cols.slice(1)
            const repo = cols[0]
            gazers.set(repo, users)
            for (const user of users) {
                if (!stars.has(user)) {
                    stars.set(user, [])
                }
                stars.get(user).push(repo)
            }
        },
        n
    )
}

async function processLines(filename, handleLine, maxCount = -1) {
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
        handleLine(line, count)
    }
}

function frac(num, dem) {
    const percent = ((100 * num) / dem).toFixed(2)
    return `${num.toLocaleString()}/${dem.toLocaleString()} (${percent}%)`
}
