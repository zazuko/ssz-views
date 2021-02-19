import cubeViewQuery from 'rdf-cube-view-query/index.js'
import rdf from 'rdf-ext'
import ns from '../namespaces.js'

const { LookupSource } = cubeViewQuery

function filterTerm (property, value) {
  if (typeof value === 'object') {
    if (value.function) {
      return rdf.literal(value.value || value.eq) // TODO: day workaround
    }

    value = value.value
  }

  if (property.equals(ns.property('ZEIT'))) {
    return zeitLiteral(value)
  }

  return ns.code(value)
}

function product (append, existing) {
  if (!existing) {
    return append.map(value => [value])
  }

  const result = []

  for (const row of existing) {
    for (const value of append) {
      result.push(row.slice().concat([value]))
    }
  }

  return result
}

function cubeProperties ({ data, publication, request }) {
  return data
    .filter(c => c !== 'RAUM' && c !== 'ZEIT')
    .reduce((properties, key, index) => {
      const isMeasure = index === 0
      const term = isMeasure ? ns.measure(key) : ns.property(key)
      const unfold = publication['VeröffentlichungSpalten'].includes(key)
      const visible = !unfold || isMeasure
      const filters = request.Filters[key] || {}

      properties.push({
        key,
        term,
        isMeasure,
        visible,
        unfold,
        filters
      })

      return properties
    }, [])
}

function toCubeTerm (array) {
  return ns.scube(array.filter(c => c !== 'RAUM' && c !== 'ZEIT').join('-'))
}

function zeitLiteral (value) {
  if (value.length === 4) {
    return rdf.literal(value, ns.xsd.gYear)
  }

  return rdf.literal(value, ns.xsd.date)
}

function zeitJoin ({ bezugszeit, sources, view }) {
  if (!bezugszeit) {
    return {}
  }

  const dimension = view.createDimension({
    source: sources,
    path: ns.property('ZEIT')
  })

  const lookupSource = LookupSource.fromSource(sources[0])

  const endDimension = view.createDimension({
    source: lookupSource,
    path: ns.sschema('hasEnd'),
    join: dimension
  })

  const referenceDimension = view.createDimension({
    source: lookupSource,
    path: ns.sschema('referenceTime'),
    join: dimension
  })

  const referenceFilter = referenceDimension.filter.eq(ns.code(bezugszeit))

  view.addDimension(dimension)
  view.addDimension(endDimension)
  view.addFilter(referenceFilter)

  return {
    endDimension
  }
}

export {
  cubeProperties,
  filterTerm,
  product,
  toCubeTerm,
  zeitJoin
}
