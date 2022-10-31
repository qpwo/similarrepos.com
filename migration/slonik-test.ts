import { createPool, sql } from 'slonik'

async function main() {
    const db = await createPool(
        `postgresql://postgres:${process.env.PGPASSWORD}@localhost:5432/postgres`
    )
    const res = await db.any(sql`SELECT ${2 + 2} as total`)
    console.log(res)
    await db.end()
}

void main()
