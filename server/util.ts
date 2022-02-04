export function sql(strings: TemplateStringsArray, ..._keys: never[]): string {
    if (strings.length > 1) throw Error('do not interpolate sql strings')
    return strings[0]
}
