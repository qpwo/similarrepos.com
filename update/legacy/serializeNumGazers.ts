import { readFileSync, writeFileSync } from 'fs'
import { chunk } from 'lodash'
import { deserialize, serialize } from 'v8'
import { numGazersdb } from '../db'
import { log, readNumGazersMap } from '../util'

const numGazersMap = new Map<string, number>()

async function setup() {
    /*
    let i = 0
    for await (const [key, val] of numGazersdb.iterator()) {
        if (i % 100_000 === 0) logDelta(`${i} values loaded`)
        numGazersMap.set(key, val)
        i++
    }
    */
    log('about to get all pairs')
    const pairs = await numGazersdb.iterator().all()
    log('got all pairs')
    let i = 0
    for (const p of pairs) {
        numGazersMap.set(p[0], p[1])
        i++
        if (i % 100000 === 0) log(`${i} values loaded`)
    }
    log('serializing')
    const numGazersBuf = serialize(numGazersMap)
    log('writing')
    writeFileSync('numGazersMap.v8', numGazersBuf)
    log('done')
}

async function testRead() {
    log('about to read file')
    const buf = readFileSync('numGazersMap.v8')
    log('about to deserialize it')
    const map: Map<string, number> = deserialize(buf)
    log('about to read a value')
    log('value:', map.get('preactjs/preact'))
}

async function splitUpRepos() {
    const numPieces = 3
    log(`will split into ${numPieces} pieces`)
    log('reading map')
    const map = readNumGazersMap()
    log('extracting keys')
    const keys = [...map.keys()]
    log('first key:', keys[0])
    log('last key:', keys.at(-1))
    log('breaking it up')
    const batches = chunk(keys, Math.ceil(keys.length / numPieces))
    log('writing files')
    batches.forEach((batch, i) =>
        writeFileSync(`repos${i}.v8`, serialize(batch))
    )
    log('done')
}

if (process.env.test === 'yes') testRead()
if (process.env.splitUpRepos === 'yes') splitUpRepos()