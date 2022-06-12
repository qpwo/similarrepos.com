const { ClassicLevel } = require('classic-level')
const db_ = new ClassicLevel('db', {
    valueEncoding: 'json',
    createIfMissing: false,
})
const starsdb = db_.sublevel('stars', { valueEncoding: 'json' })
const statusdb = db_.sublevel('status', { valueEncoding: 'json' })
await starsdb.get('01brett')
await starsdb.get('01remi')
await statusdb.get('01remi')
