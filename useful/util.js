const { appendFileSync, createReadStream } = require('fs')
const { createInterface } = require('readline')

function memoryUsed() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    return `${Math.round(used * 100) / 100} MB`
}
exports.memoryUsed = memoryUsed
function frac(num, dem) {
    const percent = ((100 * num) / dem).toFixed(2)
    return `${num.toLocaleString()}/${dem.toLocaleString()} (${percent}%)`
}
exports.frac = frac
function hhmmss(ms) {
    const sec = (ms / 1000) | 0
    const hours = Math.floor(sec / 3600)
    const minutes = Math.floor((sec - hours * 3600) / 60)
    const seconds = sec - hours * 3600 - minutes * 60
    return `${hours}h${minutes}m${seconds}s`
}
exports.hhmmss = hhmmss

function log(...args) {
    console.log(new Date().toLocaleString(), memoryUsed(), ...args)
    appendFileSync(
        'log.txt',
        JSON.stringify([new Date().toLocaleString(), memoryUsed(), ...args]) +
            '\n'
    )
}
exports.log = log

async function processLines(filename, handleLine, maxCount = -1) {
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    let count = 0
    for await (const line of createInterface({
        input: createReadStream(filename),
    })) {
        count += 1
        if (maxCount > 0 && count > maxCount) {
            break
        }
        // Each line in input.txt will be successively available here as `line`.
        handleLine(line, count)
    }
}
exports.processLines = processLines
