import { AceBase } from 'acebase'
const db = new AceBase('mydb') // Creates or opens a database with name "mydb"
export async function ready() {
    return await db.ready()
}
