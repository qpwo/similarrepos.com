// id,last_pulled,had_error,is_user
// 2,1666765738,false,false
// 3,1666765739,false,true

const { readFileSync, createWriteStream, createReadStream } = require("fs")
const { createInterface } = require("readline")

async function main() {
    const readStream = createReadStream('status.csv')
    const lines = createInterface({
        input: readStream,
        crlfDelay: Infinity
    })

    const stream = createWriteStream('status2.csv')
    stream.write('id,last_pulled,had_error,is_user\n')


    let i = 0
    for await (const line of lines) {
        if (i === 0) {
            i++
            continue
        }
        if (i % 50_000 === 0) {
            console.log(i.toLocaleString())
        }
        const [id, last_pulled, had_error, is_user] = line.split(',')
        stream.write(`${id},${last_pulled === 'null' ? '' : new Date((+last_pulled) * 1000).toISOString()},${had_error},${is_user}\n`)
        i++
    }
    stream.end()
}
void main()
