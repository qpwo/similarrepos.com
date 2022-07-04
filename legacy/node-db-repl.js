const { ClassicLevel } = require('classic-level')
const db_ = new ClassicLevel('db', {
    valueEncoding: 'json',
    createIfMissing: false,
})
const starsdb = db_.sublevel('stars', { valueEncoding: 'json' })
const gazersdb = db_.sublevel('gazers', { valueEncoding: 'json' })
const statusdb = db_.sublevel('status', { valueEncoding: 'json' })
const numgazersdb = db_.sublevel('numgazers', { valueEncoding: 'json' })
const costarsdb = db_.sublevel('costars', { valueEncoding: 'json' })
await starsdb.get('01brett')
await starsdb.get('01remi')
await statusdb.get('01remi')

const ks = starsdb.keys()
for (let i = 0; i < 20; i++) console.log(await ks.next())
