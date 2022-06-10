import { gazersdb, starsdb, Status, statusdb } from '../update/db'

const oldDate = new Date('2020-05-01').toISOString()
const BATCH_SIZE = 10_000
const log = (...args: any[]) =>
    console.log(new Date().toLocaleTimeString(), ...args)

main()
async function main() {
    log('starting up')
    log(
        '================ putting all USERS in status database ================'
    )
    const batch: { type: 'put'; key: string; value: Status }[] = []
    for await (const key of starsdb.keys()) {
        if (batch.length >= BATCH_SIZE) {
            await statusdb.batch(batch)
            batch.length = 0
            log('\tdid batch')
        }
        batch.push({
            type: 'put',
            key,
            value: { hadError: false, type: 'user', lastPulled: oldDate },
        })
    }
    await statusdb.batch(batch)
    batch.length = 0
    log('\tdid batch')

    log(
        '================ putting all REPOS in status database ================'
    )
    for await (const key of gazersdb.keys()) {
        if (batch.length >= BATCH_SIZE) {
            await statusdb.batch(batch)
            batch.length = 0
            log('\tdid batch')
        }
        batch.push({
            type: 'put',
            key,
            value: { hadError: false, type: 'repo', lastPulled: oldDate },
        })
    }
    await statusdb.batch(batch)
    batch.length = 0
    log('\tdid batch')
    log('DONE')
}
