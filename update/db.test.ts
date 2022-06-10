import { starsdb, gazersdb, statusdb } from './db'

main()

async function main() {
    console.log('qpwo stars:', (await starsdb.get('qpwo')).slice(0, 10))
    console.log(
        'preact gazers:',
        (await gazersdb.get('preactjs/preact')).slice(0, 10)
    )
    console.log('qpwo status:', await statusdb.get('qpwo'))
}
