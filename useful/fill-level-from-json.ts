import { createReadStream, readFileSync } from 'fs'
import { ClassicLevel } from 'classic-level'
import { createInterface } from 'readline'

const db_ = new ClassicLevel('db', { valueEncoding: 'json' })
const db = db_.sublevel<string, string[]>('similar', { valueEncoding: 'json' })

const filename = 'data/similar-map.json'

const log = (...args: any[]) =>
    console.log(new Date().toLocaleTimeString(), ...args)

main()
async function main() {
    log('starting batches')
    const batch: { type: 'put'; key: string; value: string[] }[] = []

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
        batch.push({
            type: 'put',
            key: JSON.parse(key),
            value: JSON.parse(value.slice(0, -1)),
        })
    }
}
