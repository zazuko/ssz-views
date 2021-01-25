import streams from 'readable-stream'

const { Transform } = streams

function dimensionsToHeader (dimensions) {
  return dimensions.map(dimension => dimension.property.value).join(',')
}

function observationToCsvLine (dimensions, observation) {
  return dimensions.map(dimension => observation[dimension.variable.value].value).join(',')
}

class ObservationsToCsv extends Transform {
  constructor ({ dimensions }) {
    super({ objectMode: true })

    this.dimensions = dimensions

    this.push(`${dimensionsToHeader(this.dimensions)}\n`)
  }

  _transform (observation, encoding, callback) {
    callback(null, `${observationToCsvLine(this.dimensions, observation)}\n`)
  }
}

function toCsvStream (input, dimensions) {
  const toCsv = new ObservationsToCsv({ dimensions })

  input.pipe(toCsv)

  return toCsv
}

export default toCsvStream
