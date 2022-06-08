'use strict'

import Koa from 'koa'

function getHtml(title, body) {
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
            <p>Use the url bar ^^^. Try similarrepos.com/preactjs/preact</p>
        `
    )
}

function getSimilarPage(repo) {
    return getHtml(
        `${repo} similar repos`,
        `
            <h1>Similar repositories to ${repo}:</h1>
            <ul>
            <
            </ul>
        `
    )
}

const app = new Koa()

app.use(ctx => {
    ctx.body = `Hello World. ctx.path=${ctx.path}`
})

app.listen(3000)
