import { createWriteStream, rmSync } from 'fs'
import * as lev from '../update/db'
const MAX_ROWS = 500_000_000
const LOG_FREQUENCY = 20_000
async function main() {
    setOutput('stars.csv')
    console.log('user,repo')
    let count = 0
    for await (const [user, repos] of lev.starsdb.iterator()) {
        if (count++ > MAX_ROWS) break
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
        for (const repo of repos) {
            const row = [user, repo]
            console.log(row.join(','))
        }
    }

    setOutput('gazers.csv')
    console.log('repo,user')
    count = 0
    for await (const [repo, users] of lev.gazersdb.iterator()) {
        if (count++ > MAX_ROWS) break
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
        for (const user of users) {
            const row = [repo, user]
            console.log(row.join(','))
        }
    }

    // setOutput('num_gazers.csv')
    // console.log('repo,num_gazers')
    // count = 0
    // for await (const [repo, num_gazers] of lev.gazersdb.iterator()) {
    //     if (count++ > MAX_ROWS) break
    //     if (count % LOG_FREQUENCY === 0) console.error(new Date().toLocaleTimeString(), count.toLocaleString())
    //     const row = [repo, num_gazers]
    //     console.log(row.join(','))
    // }

    setOutput('status.csv')
    console.log('id,last_pulled,had_error,type')
    count = 0
    for await (const [key, val] of lev.statusdb.iterator()) {
        if (count++ > MAX_ROWS) break
        if (count % LOG_FREQUENCY === 0)
            console.error(
                new Date().toLocaleTimeString(),
                count.toLocaleString()
            )
        const row = [
            key,
            val.lastPulled ? new Date(val.lastPulled).getTime() : null,
            val.hadError,
            val.type,
        ]
        console.log(row.join(','))
    }
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
