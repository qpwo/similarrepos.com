import { getAllEdges } from './starpuller'
import tokens from '../ignore/tokens.json'
const token = tokens[0]

async function test() {
    console.log(
        await getAllEdges({
            mode: 'gazers',
            items: ['preactjs/preact'],
            batchSize: 10,
            logger: console.log,
        })
    )
    console.log(
        await getAllEdges({
            mode: 'stars',
            items: ['qpwo'],
            batchSize: 10,
            logger: console.log,
        })
    )
}
void test()
