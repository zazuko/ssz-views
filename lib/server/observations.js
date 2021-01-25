import clownface from 'clownface'
import ViewQuery from 'rdf-cube-view-query/lib/query/ViewQuery/index.js'
import rdf from 'rdf-ext'
import SparqlCient from 'sparql-http-client/StreamClient.js'
import ns from '../namespaces.js'
import toCsvStream from './observations/toCsvStream.js'
import toQuadStream from './observations/toQuadStream.js'

function middleware ({ store }) {
  // create a client with streaming interface
  const client = new SparqlCient({ endpoint: store.client.query.endpoint })

  return async (req, res, next) => {
    try {
      // fetch view quads from store
      const ptr = clownface({ dataset: await store.view(req.absoluteUrl()) })

      // build query and result dimensions from view quads
      const observationSet = rdf.namedNode(req.absoluteUrl())
      const { query, dimensions } = new ViewQuery(ptr.has(ns.rdf.type, ns.view.View))
      const resultDimensions = dimensions.array.filter(dimension => dimension.isResult)

      // run query
      const stream = await client.query.select(query.toString(), { operation: 'postDirect' })

      // handle csv requests...
      if (req.accepts('text/csv')) {
        return toCsvStream(stream, resultDimensions).pipe(res)
      }

      // ...or rdf by default
      res.quadStream(toQuadStream(stream, observationSet, resultDimensions))
    } catch (err) {
      return next(err)
    }
  }
}

export default middleware
