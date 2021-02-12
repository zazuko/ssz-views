import express from 'express'
import rdfHandler from '@rdfjs/express-handler'
import FileStore from './lib/FileStore.js'
import SparqlStore from './lib/SparqlStore.js'
import SparqlClient from 'sparql-http-client/ParsingClient.js'
import fromStore from './lib/server/fromStore.js'
import observations from './lib/server/observations.js'

async function middleware (config) {
  let store

  if (config.viewEndpointUrl) {
    store = new SparqlStore({
      baseUrl: config.baseUrl,
      endpointUrl: config.viewEndpointUrl,
      user: config.viewEndpointAuthentication.user,
      password: config.viewEndpointAuthentication.password
    })
  } else {
    store = new FileStore({
      baseUrl: config.baseUrl,
      viewPath: config.viewPath
    })
  }

  const client = new SparqlClient({
    endpointUrl: config.endpointUrl,
    user: config.endpointAuthentication.user,
    password: config.endpointAuthentication.password
  })

  const router = new express.Router()

  router.use(rdfHandler())

  router.get('/', fromStore({ store }))
  router.get('/:id', fromStore({ store }))
  router.get('/:id/observation/', observations({ client, store }))

  return router
}

export default middleware
