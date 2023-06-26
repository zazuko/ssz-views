import clownface from 'clownface'
import ViewQuery from 'rdf-cube-view-query/lib/query/ViewQuery/index.js'
import rdf from 'rdf-ext'
import SparqlClient from 'sparql-http-client/StreamClient.js'
import SimpleClient from 'sparql-http-client/SimpleClient.js'
import ns from '../namespaces.js'
import toCsvStream from './observations/toCsvStream.js'
import toQuadStream from './observations/toQuadStream.js'

function middleware ({ client: { query: { endpoint }}, store }) {
  return async (req, res, next) => {
    try {
      // fetch view quads from store
      const ptr = clownface({ dataset: await store.view(req.absoluteUrl()) })

      // build query and result dimensions from view quads
      const observationSet = rdf.namedNode(req.absoluteUrl())
      const { query, dimensions } = new ViewQuery(ptr.has(ns.rdf.type, ns.view.View))
      const resultDimensions = dimensions.array.filter(dimension => dimension.isResult)

      // handle csv requests...
      if (req.accepts('text/csv')) {
        // make sure we have a client with a streaming interface
        const client = new SimpleClient(endpoint)
        const rawCsv = await client.query.select(query.toString(), {
          operation: 'postDirect',
          headers: {
            accept: 'text/csv'
          }
        })
        res.set('Content-Type', 'text/csv')

        rawCsv.body.on('error', err => next(err))
        return toCsvStream(rawCsv.body, resultDimensions).pipe(res)
      }

      // ...or rdf by default
      // make sure we have a client with a streaming interface
      const streamClient = new SparqlClient({ endpoint })
      const stream = await streamClient.query.select(query.toString(), { operation: 'postDirect' })
      stream.on('error', err => next(err))
      await res.quadStream(toQuadStream(stream, observationSet, resultDimensions))
    } catch (err) {
      return next(err)
    }
  }
}

export default middleware
