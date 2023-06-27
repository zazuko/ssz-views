import { Transform } from 'readable-stream'
import ns from '../../namespaces.js'

function dimensionsToHeader (dimensions) {
  return dimensions.map(dimension => {
    const identifier = dimension.ptr.out(ns.schema.identifier).value
    const fallbackHeader = dimension.property.value.split('/').slice(-1)[0]

    return `"${identifier || fallbackHeader}"`
  }).join(',')
}

export function replaceHeader (dimensions) {
  return new (class extends Transform {
    constructor () {
      super()
      this.headerReplaced = false
    }

    _transform (row, enc, next) {
      if (this.headerReplaced) {
        return next(null, row)
      }

      this.headerReplaced = true
      return next(null, dimensionsToHeader(dimensions))
    }
  })()
}
