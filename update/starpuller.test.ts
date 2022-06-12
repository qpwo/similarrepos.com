import { getAllTargets } from './starpuller'
import tokens from '../ignore/tokens.json'
const token = tokens[0]

async function test() {
    // await testGazers()
    await testStars()
    async function testGazers() {
        const completed: Record<string, string[]> = {}
        const failed: string[] = []
        await getAllTargets({
            mode: 'gazers',
            sources: ['preactjs/preact', 'doesnotexist/sdfksjdnfkjnds'],
            stopAt: { 'preactjs/preact': 'alinademi' },
            logger: console.log,
            onComplete(source, targets) {
                completed[source] = targets
            },
            onFail(source) {
                failed.push(source)
            },
        })
        console.log(JSON.stringify({ completed, failed }))
    }
    async function testStars() {
        const completed: Record<string, string[]> = {}
        const failed: string[] = []

        await getAllTargets({
            mode: 'stars',
            sources: ['0wQ', 'nonexistent8745691827346'],
            stopAt: { '0wQ': 'liriliri/eruda' },
            logger: console.log,
            onComplete(source, targets) {
                completed[source] = targets
            },
            onFail(source) {
                failed.push(source)
            },
        })
        console.log(JSON.stringify({ completed, failed }))
    }
}
void test()
