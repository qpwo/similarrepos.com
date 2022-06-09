import { createReadStream, readFileSync } from "fs"
import { Level } from "level"
import { createInterface } from "readline"

const db_ = new Level("db", { valueEncoding: 'json' })
const db = db_.sublevel("similar", { valueEncoding: 'json' })

const filename = 'data/similar-map.json'

const log = (...args) => console.log(new Date().toLocaleTimeString(), ...args)

main()
async function main() {
    log('starting batches')
    const batch = []

    for await (const line of createInterface({
        input: createReadStream(filename),
    })) {
        if (batch.length >= 10000) {
            await db.batch(batch)
            batch.length = 0
            log('did batch')
        }
        const [key, value] = line.split(':')
        if (value === undefined) {
            log('skipping a line')
            continue
        }
        batch.push({ type: 'put', key: JSON.parse(key), value: JSON.parse(value.slice(0, -1)) })

    }
}
