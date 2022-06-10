import { createReadStream, readFileSync } from 'fs'
import { ClassicLevel } from 'classic-level'
import { createInterface } from 'readline'

const [filename, dbName] =
    // ['stargazers.tsv', 'gazers']
    ['stars.tsv', 'stars']
const db_ = new ClassicLevel('db', { valueEncoding: 'json' })
type Key = string

type Value = string[]

const db = db_.sublevel<Key, Value>(dbName, { valueEncoding: 'json' })

const log = (...args: any[]) =>
    console.log(new Date().toLocaleTimeString(), ...args)

main()
async function main() {
    log('starting batches')
    const batch: { type: 'put'; key: Key; value: Value }[] = []

    for await (const line of createInterface({
        input: createReadStream(filename),
    })) {
        if (batch.length >= 10000) {
            void db.batch(batch)
            batch.length = 0
            log('did batch')
        }
        const [key, ...value] = line.split('\t')
        // console.log({ key, value: value.slice(0, 10) })
        batch.push({ type: 'put', key, value })
    }
}
