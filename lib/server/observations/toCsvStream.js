import once from 'lodash/once.js'
import streams from 'readable-stream'
import ns from '../../namespaces.js'

const { Transform } = streams

async function dimensionsToHeader (dimensions) {
  return dimensions.map(dimension => {
    const identifier = dimension.ptr.out(ns.schema.identifier).value
    const fallbackHeader = dimension.property.value.split('/').slice(-1)[0]

    return `"${identifier || fallbackHeader}"`
  }).join(',')
}

function observationToCsvLine (dimensions, observation) {
  return dimensions.map(dimension => `"${observation[dimension.variable.value].value}"`).join(',')
}

class ObservationsToCsv extends Transform {
  constructor ({ dimensions }) {
    super({ objectMode: true })

    this.dimensions = dimensions

    this.init = once(this._init.bind(this))
  }

  async _init () {
    this.push(`${await dimensionsToHeader(this.dimensions)}\n`)
  }

  async _transform (observation, encoding, callback) {
    try {
      await this.init()

      if (!observation || Object.keys(observation).length === 0) {
        return callback()
      }

      callback(null, `${observationToCsvLine(this.dimensions, observation)}\n`)
    } catch (err) {
      callback(err)
    }
  }
}

function toCsvStream (input, dimensions) {
  const toCsv = new ObservationsToCsv({ dimensions })

  input.pipe(toCsv)

  return toCsv
}

export default toCsvStream
