import { gazersdb, numGazersdb } from '../db'

const BATCH_SIZE = 100
const BATCHES_PER_LOG = 1000

async function main() {
    let numRepos = 0
    let numBatches = 0
    let batch = numGazersdb.batch()
    for await (const [repo, gazers] of gazersdb.iterator()) {
        batch.put(repo, gazers.length)
        numRepos++
        if (numRepos % BATCH_SIZE === 0) {
            await batch.write()
            batch = numGazersdb.batch()
            numBatches++
            if (numBatches % BATCHES_PER_LOG === 0) {
                // prettier-ignore
                console.log(new Date(), `completed ${tls(numBatches)} batches (${tls(numRepos)} repos)`)
            }
        }
    }
}

function tls(x: number) {
    return x.toLocaleString()
}

main()
