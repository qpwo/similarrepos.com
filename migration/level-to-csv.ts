import { createWriteStream, rmSync, WriteStream } from 'fs'
import * as lev from '../update/db'
import { BigMap } from './bigmap'
const MAX_ROWS = 100_000_000
const LOG_FREQUENCY = 50_000

// a Map can't do more than about 17 million entries apparently
const idOf = new BigMap() as Map<string, number>
let nextId = 1
function getId(name: string) {
    const has = idOf.get(name)
    if (has) return has
    nextId += 1
    idOf.set(name, nextId)
    return nextId
}

const dir = 'migration/csv/'
async function main() {
    let path = dir + 'statuses.csv'
    try {
        rmSync(path)
    } catch {}
    let stream = null as unknown as WriteStream
    setOutput('status.csv')
    stream.write('id,last_pulled,had_error,is_user\n')
    let count = 0
    for await (const [name, val] of lev.statusdb.iterator()) {
        if (count++ > MAX_ROWS) break
        maybeLog()
        getId(name)
        stream.write(
            getId(name) +
                ',' +
                (val.lastPulled
                    ? (new Date(val.lastPulled).getTime() / 1000) | 0
                    : null) +
                ',' +
                val.hadError +
                ',' +
                (val.type === 'user') +
                '\n'
        )
    }
    stream.end()

    setOutput('stars.csv')
    stream.write('user_id,repo_id\n')
    count = 0
    for await (const [user, repos] of lev.starsdb.iterator()) {
        const userId = getId(user)
        if (count++ > MAX_ROWS) break
        maybeLog()
        const lines = repos.map(r => userId + ',' + getId(r) + '\n').join('')
        stream.write(lines)
    }
    stream.end()

    setOutput('names.csv')
    stream.write('id,name\n')
    count = 0
    for (const [name, id] of idOf.entries()) {
        stream.write(id + ',' + name + '\n')
        count++
        maybeLog()
    }
    stream.end()

    console.error(new Date().toLocaleTimeString(), 'All done!')

    function maybeLog() {
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
    }
    function setOutput(filename: string) {
        path = dir + filename
        stream = createWriteStream(path)
        try {
            rmSync(path)
        } catch {}
        console.log(path, '---------------------')
    }
}

void main()
