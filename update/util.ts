export const failure = Symbol('failure')

export type ItemInfo = {
    failed: boolean
    done: boolean
    items: string[]
    name: string
    stargazerCount: null | number
    lastCursor?: string
}
