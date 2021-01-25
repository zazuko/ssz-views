import absoluteUrl from 'absolute-url'
import express from 'express'
import morgan from 'morgan'
import rdfHandler from '@rdfjs/express-handler'
import Store from './lib/Store.js'
import fromStore from './lib/server/fromStore.js'
import observations from './lib/server/observations.js'

async function middleware (config) {
  const store = new Store({
    baseUrl: config.baseUrl,
    endpointUrl: config.endpointUrl,
    viewPath: config.viewPath
  })

  const router = new express.Router()

  router.use(morgan('combined'))
  router.use(absoluteUrl())
  router.use(rdfHandler())

  router.get('/', fromStore({ store }))
  router.get('/:id', fromStore({ store }))
  router.get('/:id/observation/', observations({ store }))

  return router
}

export default middleware
