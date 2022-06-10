import { getAllEdges } from './starpuller'

async function test() {
    const out = await getAllEdges(
        'gazers',
        ['preactjs/preact'],
        10,
        console.log
    )
    console.log(out)
}
void test()
