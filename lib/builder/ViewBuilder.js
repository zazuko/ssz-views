import { resolve } from 'path'
import cubeViewQuery from 'rdf-cube-view-query'
import rdf from 'rdf-ext'
import ns from '../namespaces.js'
import SparqlStore from '../SparqlStore.js'
import { cubeProperties, filterTerm, product, toCubeTerm, zeitJoin } from './utils.js'

const { CubeSource, Source, View } = cubeViewQuery

class ViewBuilder {
  constructor ({ baseUrl, endpointUrl, graphUrl }) {
    this.baseUrl = baseUrl
    this.endpointUrl = endpointUrl
    this.graphUrl = graphUrl
    this.store = new SparqlStore({ endpointUrl })
  }

  async build (config, id) {
    const rawSources = await this.buildSources(config, id)

    const source = new Source({
      endpointUrl: this.endpointUrl,
      sourceGraph: this.graphUrl
    })

    let term = rdf.blankNode()

    if (this.baseUrl) {
      const iri = new URL(this.baseUrl)
      iri.pathname = resolve(iri.pathname, id)
      term = rdf.namedNode(iri)
    }

    const view = new View({ parent: source, term })

    const sources = []

    for (const rawSource of rawSources) {
      const valueSource = CubeSource.fromSource(source, rawSource.cube)

      sources.push(valueSource)

      for (const rawDimension of rawSource.dimensions) {
        const dimension = view.createDimension({
          source: valueSource,
          path: rawDimension.property,
          as: rawDimension.as
        })

        if (rawDimension.visible) {
          view.addDimension(dimension)
        }

        if (rawDimension.filter) {
          view.addFilter(dimension.filter.eq(rawDimension.filter))
        }
      }
    }

    const raumDimension = view.createDimension({
      source: sources,
      path: ns.property('RAUM')
    })

    view.addDimension(raumDimension)

    await this.addFilter(view, raumDimension, ns.property('RAUM'), config.Abfrage[0].Filters.RAUM)

    const zeitFilterDef = config.Abfrage[0].Filters.ZEIT
    const { endDimension } = zeitJoin({ bezugszeit: zeitFilterDef.Bezugszeit, sources, view })
    await this.addFilter(view, endDimension, ns.property('ZEIT'), zeitFilterDef)

    // link to dataset
    const datasetIri = new URL(this.baseUrl)
    datasetIri.pathname = resolve(datasetIri.pathname, config.DataSetMetadaten.DataSetID)

    view.ptr
      .addOut(ns.rdf.type, ns.cube.Cube)
      .addOut(ns.schema.isBasedOn, rdf.namedNode(datasetIri))

    return view
  }

  async buildSources (config, id) {
    const sources = []

    const publication = config['Veröffentlichung'].find(p => p['VeröffentlichungID'] === id)

    if (!publication) {
      throw new Error(`publication ${id} not found`)
    }

    for (const request of config.Abfrage) {
      for (const [, data] of Object.entries(request.Cubes)) {
        const properties = cubeProperties({ data, publication, request })

        let filterValues = null

        for (const property of properties) {
          if (property.unfold) {
            const values = await this.valuesOfProperty(property)

            filterValues = product(values, filterValues)
          } else {
            filterValues = product([null], filterValues)
          }
        }

        if (!filterValues) {
          filterValues = [null]
        }

        for (const values of filterValues) {
          sources.push({
            cube: toCubeTerm(data),
            dimensions: properties.map((property, index) => {
              const postfix = values.filter(Boolean).map(term => term.value.split('/').slice(-1)[0]).join('-')

              return {
                property: property.term,
                as: postfix ? rdf.namedNode(`${property.term.value}-${postfix}`) : property.term,
                filter: values[index],
                visible: property.visible
              }
            })
          })
        }
      }
    }

    return sources
  }

  async valuesOfProperty (property) {
    let values = []

    if (property.filters.Hierarchie) {
      values = values.concat(await this.store.valuesOfHierarchy(property.filters.Hierarchie))
    }

    if (property.filters.eq) {
      if (values.length !== 0) {
        values = values.filter(value => value.value.includes(property.filters.eq))
      } else {
        values = [ns.code(property.filters.eq)]
      }
    }

    return values
  }

  async addFilter (view, dimension, property, config) {
    if (!config) {
      return
    }

    for (const [key, value] of Object.entries(config)) {
      switch (key) {
        case 'eg':
          view.addFilter(dimension.filter.eq(filterTerm(property, value)))
          break

        case 'gt':
          view.addFilter(dimension.filter.gt(filterTerm(property, value)))
          break

        case 'Hierarchie':
          view.addFilter(dimension.filter.in(await this.store.valuesOfHierarchy(value)))
          break

        case 'Bezugszeit':
          break

        default:
          throw new Error(`unknown filter type ${key}(${value})`)
      }
    }
  }
}

export default ViewBuilder
