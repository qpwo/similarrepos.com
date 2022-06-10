import { ClassicLevel } from 'classic-level'

/*
declare const brand: unique symbol
type Brand<K, T> = K & { readonly ___: T }
type Repo = Brand<string, 'Repo'>
type User = Brand<string, 'User'>
*/

type Repo = string & { ___?: 'repo' }
type User = string & { ___?: 'user' }

const db_ = new ClassicLevel('db', { valueEncoding: 'json' })
export const starsdb = db_.sublevel<User, Repo[]>('stars', {
    valueEncoding: 'json',
})
export const gazersdb = db_.sublevel<Repo, User[]>('gazers', {
    valueEncoding: 'json',
})
