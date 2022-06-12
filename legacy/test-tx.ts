import { ClassicLevel } from 'classic-level'
const db = new ClassicLevel('db', {
    valueEncoding: 'json',
    errorIfExists: true,
})

type User = string
type Balance = number
type Locked = boolean
const balancesdb = db.sublevel<User, Balance>('balances', {
    valueEncoding: 'json',
})
const locksdb = db.sublevel<User, Locked>('locks', { valueEncoding: 'json' })

async function getSet(user: User, amount: number) {
    let resolve
    const p = new Promise(r => (resolve = r))
    const intervalId = setInterval(async () => {
        const locked = await locksdb.get(user)
        if (locked) return
        await locksdb.put(user, true)
        clearInterval(intervalId)
        // const
    }, 1)
    return p
}
