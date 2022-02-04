// rm -f scripts.js && tsc scripts.ts --esModuleInterop && node scripts.js
import sqlite from 'better-sqlite3'

import { sql } from './util'
const db = sqlite('sqlite.db')
const repo = 'mzlogin/chinese-copywriting-guidelines'
const repoId = db
    .prepare(sql`SELECT id FROM nameOf WHERE string = ?`)
    .get(repo).id
const gazers = db
    .prepare(sql`SELECT user FROM stars WHERE repo = ?`)
    .pluck()
    .all(repoId)
console.log({ repoId, gazers })
// const result = db.prepare('SELECT tgt FROM t WHERE src = ?').all(1)
// console.log(result)

// const bigQueryResult = db.prepare``

// need to find number of costars of other repos from initial repo
