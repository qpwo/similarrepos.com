import { ClassicLevel } from 'classic-level'

/*
declare const brand: unique symbol
type Brand<K, T> = K & { readonly ___: T }
type Repo = Brand<string, 'Repo'>
type User = Brand<string, 'User'>
*/

type Repo = string & { ___?: 'repo' }
type User = string & { ___?: 'user' }

type IsoDateString = string & { ___?: 'date' }
export interface Status {
    lastPulled: false | IsoDateString
    hadError: boolean
    type: 'repo' | 'user'
}
export interface Costar {
    repo: Repo
    costars: number
    totalStars: number
    computedAt: IsoDateString
}

const db_ = new ClassicLevel('db', {
    valueEncoding: 'json',
    createIfMissing: false,
})
export const starsdb = db_.sublevel<User, Repo[]>('stars', {
    valueEncoding: 'json',
})
export const gazersdb = db_.sublevel<Repo, User[]>('gazers', {
    valueEncoding: 'json',
})
export const statusdb = db_.sublevel<Repo | User, Status>('status', {
    valueEncoding: 'json',
})
export const costarsdb = db_.sublevel<Repo, Costar[]>('costars', {
    valueEncoding: 'json',
})
