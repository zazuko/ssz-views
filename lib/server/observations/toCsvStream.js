import LineTransformStream from 'line-transform-stream'
import ns from '../../namespaces.js'

function dimensionsToHeader (dimensions) {
  return dimensions.map(dimension => {
    const identifier = dimension.ptr.out(ns.schema.identifier).value
    const fallbackHeader = dimension.property.value.split('/').slice(-1)[0]

    return `"${identifier || fallbackHeader}"`
  }).join(',')
}

class ObservationsToCsv extends LineTransformStream {
  constructor ({ dimensions }) {
    let headerReplaced = false

    super(row => {
      if (headerReplaced) {
        return row
      }

      headerReplaced = true
      return dimensionsToHeader(dimensions)
    })
  }
}

function toCsvStream (input, dimensions) {
  const toCsv = new ObservationsToCsv({ dimensions })

  input.pipe(toCsv)

  return toCsv
}

export default toCsvStream
