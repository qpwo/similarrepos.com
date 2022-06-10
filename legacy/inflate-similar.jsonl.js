const { writeFileSync, readFileSync, appendFileSync, fstat } = require('fs')
const { log, processLines } = require('./util')
const { serialize, deserialize } = require('v8')
if (require.main === module) {
    main()
}

async function main() {
    // log('loading nameMap')
    // const nameMap = deserialize(readFileSync(`data/nameMap`))
    // log('going through lines')
    const m = new Map()
    log('loading old lines')
    await processLines('data/similar.jsonl', handleLine)
    log('saving seralized data')
    writeFileSync('data/similar-id-map', serialize(m))
    log('all done')

    function handleLine(line) {
        const stuff = JSON.parse(line)
        const [mainId, similarPairs] = stuff
        m.set(mainId, similarPairs.flat())
        // const main = nameMap.get(mainId)
        // const nicePairs = similarPairs.map(([id, count]) => [
        //     nameMap.get(id),
        //     count,
        // ])
        // appendFileSync(
        //     'data/similar-map.json',
        //     `"${main}": ${JSON.stringify(nicePairs)},\n`
        // )
    }
}
