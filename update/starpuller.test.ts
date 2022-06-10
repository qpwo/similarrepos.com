import { getAllEdges } from './starpuller'

async function test() {
    console.log(
        await getAllEdges('gazers', ['preactjs/preact'], 10, console.log)
    )
    console.log(await getAllEdges('stars', ['qpwo'], 10, console.log))
}
void test()
