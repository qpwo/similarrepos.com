import { getAllTargets } from './starpuller'
import tokens from '../ignore/tokens.json'
const token = tokens[0]

async function test() {
    await testGazers()
    await testStars()
    async function testGazers() {
        function* sources() {
            for (const pair of [
                ['preactjs/preact', 'alinademi'],
                ['doesnotexist/sdfksjdnfkjnds', undefined],
            ] as const)
                yield pair as [string, string | undefined]
        }
        for await (const res of getAllTargets({
            mode: 'gazers',
            sources: sources(),
        })) {
            console.log(res)
        }
    }
    async function testStars() {
        function* sources() {
            for (const pair of [
                ['0wQ', 'liriliri/eruda'],
                ['nonexistent8745691827346', undefined],
            ])
                yield pair as [string, string | undefined]
        }
        for await (const res of getAllTargets({
            mode: 'stars',
            sources: sources(),
        }))
            console.log(JSON.stringify(res))
    }
}
void test()
