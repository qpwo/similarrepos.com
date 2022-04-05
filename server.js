'use strict'

import Router from '@koa/router'
import Koa from 'koa'
import compress from 'koa-compress'
// const bodyParse = require('@koa')
const app = new Koa()
const router = new Router()

router.get('/foo', ctx => {
    ctx.body = 'a foo is a show'
})
router.get('/bar', ctx => {
    ctx.body = 'a bar is a lar'
})
router.get('/movies/:id', ctx => {
    const id = ctx.params.id
    ctx.body = `your id is ${id}`
})
router.get('/ip', ctx => {
    ctx.body = `${ctx.request.ip}`
})

// router.get()

app.use(router.routes()).use(router.allowedMethods())
app.use(compress())
// app.use(bodyP)
app.listen(1234)

// API:
// findSimilar(repo)
