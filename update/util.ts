import { readFileSync } from 'fs'
import { deserialize } from 'v8'

export const failure = Symbol('failure')

let lastLog = Date.now()
export function log(...args: unknown[]) {
    const seconds = ((Date.now() - lastLog) / 1000).toFixed(3).padStart(6)
    console.log('\n', prettyDate(), currentMemory(), `+${seconds}: `, ...args)
    lastLog = Date.now()
}

function currentMemory() {
    const mb = process.memoryUsage().rss / 1024 / 1024
    return `${mb.toFixed(2).padStart(7, '0')} MB`
}

const dateOptions = {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
} as const
const formatter = new Intl.DateTimeFormat([], dateOptions)
function prettyDate() {
    return formatter.format(new Date())
}

export function readNumGazersMap() {
    const buf = readFileSync('numGazersMap.v8')
    const map: Map<string, number> = deserialize(buf)
    return map
}
