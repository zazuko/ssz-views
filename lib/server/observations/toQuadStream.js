import rdf from 'rdf-ext'
import streams from 'readable-stream'
import ns from '../../namespaces.js'

const { Transform } = streams

function observationToQuads (observationSet, dimensions, observation) {
  const subject = rdf.blankNode()
  const quads = []

  quads.push(rdf.quad(observationSet, ns.cube.observation, subject))

  for (const dimension of dimensions) {
    const predicate = dimension.property
    const object = observation[dimension.variable.value]

    quads.push(rdf.quad(subject, predicate, object))
  }

  return quads
}

class ObservationsToQuads extends Transform {
  constructor ({ dimensions, observationSet }) {
    super({ objectMode: true })

    this.dimensions = dimensions
    this.observationSet = observationSet
  }

  _transform (observation, encoding, callback) {
    for (const quad of observationToQuads(this.observationSet, this.dimensions, observation)) {
      this.push(quad)
    }

    callback()
  }
}

function toQuadStream (input, observationSet, dimensions) {
  const toQuads = new ObservationsToQuads({ dimensions, observationSet })

  input.pipe(toQuads)

  return toQuads
}

export default toQuadStream
