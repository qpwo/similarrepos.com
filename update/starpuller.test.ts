import { getAllTargets } from './starpuller'
import tokens from '../ignore/tokens.json'
const token = tokens[0]

async function test() {
    await testGazers()
    await testStars()
    async function testGazers() {
        const completed: Record<string, string[]> = {}
        const failed: string[] = []
        await getAllTargets({
            mode: 'gazers',
            sources: ['preactjs/preact', 'doesnotexist/sdfksjdnfkjnds'],
            logger: console.log,
            onComplete(source, targets) {
                completed[source] = targets
            },
            onFail(source) {
                failed.push(source)
            },
        })
        console.log({ completed, failed })
    }
    async function testStars() {
        const completed: Record<string, string[]> = {}
        const failed: string[] = []

        await getAllTargets({
            mode: 'stars',
            sources: ['qpwo', 'nonexistent8745691827346'],
            logger: console.log,
            onComplete(source, targets) {
                completed[source] = targets
            },
            onFail(source) {
                failed.push(source)
            },
        })
        console.log({ completed, failed })
    }
}
void test()
