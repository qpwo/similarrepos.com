import dedent from 'dedent'
import Koa from 'koa'
import { ClassicLevel } from 'classic-level'

const db_ = new ClassicLevel('db', { valueEncoding: 'json' })
const db = db_.sublevel<string, [string, number][]>('similar', {
    valueEncoding: 'json',
})
const thisUrl = 'http://localhost:3000'
function getHtml(title: string, body: string) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>
        <body>
            ${body}
        </body>
        </html>
    `
}

function getHomePage() {
    return getHtml(
        'Find similar repositories on github',
        `
            <h1>similarrepos.com</h1>
            <p>Use the url bar ^^^. Try
                <a href="${thisUrl}/preactjs/preact">
                    similarrepos.com/preactjs/preact
                </a>
            </p>
        `
    )
}

async function getSimilarPage(repo: string) {
    try {
        const similar = await db.get(repo)
        return getHtml(
            `${repo} similar repos`,
            `
            <h1>Similar repositories to ${repo}:</h1>
            <ul>
            ${similar
                .map(
                    ([repo, count]) => `<li>${count} costars: ${repo}
                <a href="https://github.com/${repo}">github</a>
                <a href="${thisUrl}/${repo}">similar</a>
            </li>`
                )
                .join('\n')}
            </ul>
        `
        )
    } catch (e) {
        return getHtml(`${repo} not found`, `<p>${repo} not found</p>`)
    }
}
const app = new Koa()

app.use(async ctx => {
    ctx.type = 'html'
    if (ctx.path === '/') {
        ctx.body = getHomePage()
    } else {
        ctx.body = 'loading'
        ctx.body = dedent(await getSimilarPage(ctx.path.slice(1)))
    }
})

app.listen(3000)