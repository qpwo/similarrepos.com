// node --max-old-space-size=12000 precompute-tables.js
// const { Worker } = require('worker_threads')
const { createReadStream, writeFileSync, readFileSync } = require('fs')
const { createInterface } = require('readline')
const { memoryUsed, frac, log } = require('./common')
const { serialize, deserialize } = require('v8')
const numStargazerRows = 3_139_019
// const path = '/Users/l/Downloads/github-data'
const path = '/home/a/Downloads'
const gazers = new Map()
const stars = new Map()
const idMap = new Map()
const nameMap = new Map()

const n = numStargazerRows
const fileReadProgressUpdateInterval = 10_000

let idCounter = 0
function idOf(x) {
    if (idMap.has(x)) return idMap.get(x)
    idCounter += 1
    idMap.set(x, idCounter)
    nameMap.set(idCounter, x)
    return idCounter
}

async function main() {
    log('\n\n\nAPPROACH:', process.argv[2], 'n:', n)
    const start = Date.now()
    await loadGazers(n)
    const saveMe = { stars, gazers, nameMap, idMap }
    for (const [name, val] of Object.entries(saveMe)) {
        log('writing file', name)
        writeFileSync('data/' + name, serialize(val))
    }
    // for (const name of Object.keys(saveMe)) {
    //     console.log(name, ':', deserialize(readFileSync('data/'+name)))
    // }
    // return
    log('done loading gazers precomputing similar')
    const keys = Array.from(gazers.keys())
    const numKeys = keys.length
    // precomputeSimilar(keys)
    const batchSize = (numKeys / 6) | 0
    log('saving 6 batches of size', batchSize)
    const f = (i, topless = false) =>
        writeFileSync(
            `data/repos${i}`,
            serialize(
                keys.slice(
                    i * batchSize,
                    topless ? undefined : (i + 1) * batchSize
                )
            )
        )
    f(0)
    f(1)
    f(2)
    f(3)
    f(4)
    f(5, true)
    // new Worker('./worker.js', { workerData: { keys: keys.slice(0,batchSize), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize, batchSize*2), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*2, batchSize*3), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*3, batchSize*4), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*4, batchSize*5), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*5), gazers, stars, nameMap } })
    // log('starting 6 batches of size', batchSize)
    // new Worker('./worker.js', { workerData: { keys: keys.slice(0,batchSize), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize, batchSize*2), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*2, batchSize*3), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*3, batchSize*4), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*4, batchSize*5), gazers, stars, nameMap } })
    // new Worker('./worker.js', { workerData: { keys: keys.slice(batchSize*5), gazers, stars, nameMap } })
    // log('done precomputing. deleting gazers and stars')
    // delete gazers
    // delete stars
    // log('done deleting')
    // const end = Date.now()
    // log('duration:', end - start)
    // log('n was', n)
    // log(`The script uses approximately ${memoryUsed()}`)
}

async function loadGazers(n = -1) {
    let pairs = []
    await processLines(
        path + '/stargazers.tsv',
        (line, num) => {
            if (num % fileReadProgressUpdateInterval === 0) {
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

void main()
