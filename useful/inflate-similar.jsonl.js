const {
    createReadStream,
    writeFileSync,
    readFileSync,
    appendFileSync,
} = require('fs')
const { createInterface } = require('readline')
const { memoryUsed, frac, log } = require('./util')
const { serialize, deserialize } = require('v8')

if (require.main === module) {
    main()
}

async function main() {
    log('loading nameMap')
    const nameMap = deserialize(readFileSync(`data/nameMap`))
    log('going through lines')
    appendFileSync('data/similar-map.json', '{\n')
    await processLines('data/similar.jsonl', handleLine)
    appendFileSync('data/similar-map.json', '}\n')

    function handleLine(line) {
        const stuff = JSON.parse(line)
        const [mainId, similarPairs] = stuff
        const main = nameMap.get(mainId)
        const nicePairs = similarPairs.map(([id, count]) => [
            nameMap.get(id),
            count,
        ])
        appendFileSync(
            'data/similar-map.json',
            `"${main}": ${JSON.stringify(nicePairs)},\n`
        )
    }
}

async function processLines(filename, handleLine, maxCount = -1) {
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    let count = 0
    for await (const line of createInterface({
        input: createReadStream(filename),
    })) {
        count += 1
        if (maxCount > 0 && count > maxCount) {
            break
        }
        // Each line in input.txt will be successively available here as `line`.
        handleLine(line, count)
    }
}
