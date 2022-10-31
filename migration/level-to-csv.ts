import { createWriteStream, rmSync } from 'fs'
import * as lev from '../update/db'
import { BigMap } from './bigmap'
const MAX_ROWS = 100_000_000
const LOG_FREQUENCY = 50_000

// a Map can't do more than about 17 million entries apparently
const idOf = new BigMap() as Map<string, number>
// const idOf: Record<string, number> = {}
// const nameOf = new Map<number, string>()
let nextId = 1
function getId(name: string) {
    const has = idOf.get(name)
    // const has = idOf[name]
    if (has) return has
    nextId += 1
    idOf.set(name, nextId)
    // idOf[name] = nextId
    // nameOf.set(nextId, name)
    return nextId
}

async function main() {
    setOutput('statuses.csv')
    console.log('id,last_pulled,had_error,is_user')
    let count = 0
    for await (const [name, val] of lev.statusdb.iterator()) {
        if (count++ > MAX_ROWS) break
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
        console.log(
            getId(name) +
                ',' +
                (val.lastPulled ? new Date(val.lastPulled).getTime() : null) +
                ',' +
                val.hadError +
                ',' +
                (val.type === 'user')
        )
    }

    setOutput('stars.csv')
    console.log('user_id,repo_id')
    count = 0
    for await (const [user, repos] of lev.starsdb.iterator()) {
        const userId = getId(user)
        if (count++ > MAX_ROWS) break
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
        console.log(repos.map(r => userId + ',' + getId(r)).join('\n'))
    }

    // setOutput('gazers.csv')
    // console.log('repo_id,user_id')
    // count = 0
    // for await (const [repo, users] of lev.gazersdb.iterator()) {
    //     const repoId = getId(repo)
    //     if (count++ > MAX_ROWS) break
    //     if (count % LOG_FREQUENCY === 0)
    //         console.error(
    //             new Date().toLocaleTimeString(),
    //             count.toLocaleString()
    //         )
    //     console.log(users.map(u => repoId + ',' + getId(u)).join('\n'))
    // }

    setOutput('names.csv')
    console.log('id,name')
    count = 0
    for (const [name, id] of idOf.entries()) {
        count++
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
        console.log(id + ',' + name)
    }

    console.error(new Date().toLocaleTimeString(), 'All done!')
}

function setOutput(filename: string) {
    const path = `./migration/csv/${filename}`
    try {
        rmSync(path)
    } catch {}
    console.error(`writing to ${path}`)
    const access = createWriteStream(path)
    process.stdout.write = access.write.bind(access)
}

void main()
