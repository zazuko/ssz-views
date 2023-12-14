import express from 'express'
import clownface from 'clownface'
import ViewQuery from 'rdf-cube-view-query/lib/query/ViewQuery/index.js'
import rdf from 'rdf-ext'
import SparqlClient from 'sparql-http-client/StreamClient.js'
import SimpleClient from 'sparql-http-client/SimpleClient.js'
import ns from '../namespaces.js'
import linestream from 'line-stream'
import { replaceHeader } from './observations/toCsvStream.js'
import toQuadStream from './observations/toQuadStream.js'

async function csvResponse (res, next) {
  const { query, endpoint, columns } = res.locals

  // make sure we have a client with a streaming interface
  const client = new SimpleClient(endpoint)
  const rawCsv = await client.query.select(query.toString(), {
    operation: 'postDirect',
    headers: {
      accept: 'text/csv'
    }
  })
  res.set('Content-Type', 'text/csv')

  rawCsv.body.on('error', next)
  return rawCsv.body.pipe(linestream()).pipe(replaceHeader(columns)).pipe(res)
}

async function quadResponse (res, next) {
  const { query, endpoint, resultDimensions, observationSet } = res.locals

  const streamClient = new SparqlClient({ endpoint })
  const stream = await streamClient.query.select(query.toString(), { operation: 'postDirect' })
  stream.on('error', err => next(err))
  await res.quadStream(toQuadStream(stream, observationSet, resultDimensions))
}

function middleware ({ client: { query: { endpoint } }, store }) {
  return express.Router()
    .use(async (req, res, next) => {
      try {
        // fetch view quads from store
        const ptr = clownface({ dataset: await store.view(req.absoluteUrl()) })

        // build query and result dimensions from view quads
        res.locals.observationSet = rdf.namedNode(req.absoluteUrl())
        const { query, result: { columns } } = new ViewQuery(ptr.has(ns.rdf.type, ns.view.View))
        res.locals.query = query
        res.locals.endpoint = endpoint
        res.locals.columns = columns
      } catch (err) {
        return next(err)
      }

      return next()
    })
    .use((req, res, next) => {
      if (req.accepts('text/csv')) {
        csvResponse(res, next)
      } else {
        quadResponse(res, next)
      }
    })
}

export default middleware
