import { resolve } from 'path'
import cubeViewQuery from 'rdf-cube-view-query'
import rdf from 'rdf-ext'
import ns from '../namespaces.js'
import SparqlStore from '../SparqlStore.js'
import { cubeProperties, filterTerm, product, toCubeTerm, zeitJoin } from './utils.js'

const { CubeSource, Filter, Source, View } = cubeViewQuery

class ViewBuilder {
  constructor ({ baseUrl, endpointUrl, graphUrl }) {
    this.baseUrl = baseUrl
    this.endpointUrl = endpointUrl
    this.graphUrl = graphUrl
    this.store = new SparqlStore({ endpointUrl })
  }

  async build (config, id) {
    const publication = config['Veröffentlichung'].find(p => p['VeröffentlichungID'] === id)
    const rawSources = await this.buildSources(config, id, publication)

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

    const date = (new Date()).toISOString().slice(0, 10)

    view.ptr
      .addOut(ns.rdf.type, ns.cube.Cube)
      .addOut(ns.rdf.type, ns.void.Dataset)
      .addOut(ns.rdf.type, ns.dcat.Dataset)
      .addOut(ns.rdf.type, ns.schema.Dataset)
      .addOut(ns.schema.identifier, rdf.literal(publication.VeröffentlichungID))
      .addOut(ns.schema.name, rdf.literal(publication.VeröffentlichungTitel))
      .addOut(ns.schema.isBasedOn, rdf.namedNode(datasetIri))
      .addOut(ns.schema.publisher, ns.sorg.SSZ)
      .addOut(ns.schema.contactPoint, ns.sorg.SSZ)
      .addOut(ns.schema.contributor, ns.sorg.Zazuko)
      .addOut(ns.schema.dateCreated, rdf.literal(date, ns.xsd.date))
      .addOut(ns.schema.dateModified, rdf.literal(date, ns.xsd.date))
      .addOut(ns.dcterms.rights, rights => {
        rights
          .addOut(ns.rdf.type, ns.dcterms.RightsStatement)
          .addOut(ns.schema.name, rdf.literal(publication.RechtsgrundlageTitel))
          .addOut(ns.schema.description, rdf.literal(publication.RechtsgrundlageText))
          .addOut(ns.schema.identifier, rdf.literal(publication.RechtsgrundlageArtikel))
      })
      .addOut(ns.dcat.distribution, distribution => {
        distribution
          .addOut(ns.rdf.type, ns.dcat.Distribution)
          .addOut(ns.dcterms.format, rdf.literal('CSV'))
          .addOut(ns.dcat.mediaType, rdf.literal('text/csv'))
          .addOut(ns.dcat.downloadURL, rdf.namedNode(`${view.ptr.value}/observation/?format=csv`))
      })
      .addOut(ns.dcat.distribution, distribution => {
        distribution
          .addOut(ns.rdf.type, ns.dcat.Distribution)
          .addOut(ns.dcterms.format, rdf.literal('RDF'))
          .addOut(ns.dcat.mediaType, rdf.literal('application/n-triples'))
          .addOut(ns.dcat.downloadURL, rdf.namedNode(`${view.ptr.value}/observation/`))
      })

    return view
  }

  async buildSources (config, id, publication) {
    const sources = []

    if (!publication) {
      throw new Error(`publication ${id} not found`)
    }

    for (const request of config.Abfrage) {
      for (const [, data] of Object.entries(request.Cubes)) {
        const properties = cubeProperties({ data, publication, request })

        let filterValues = null

        for (const property of properties) {
          if (property.unfold) {
            let values = await this.valuesOfProperty(property)

            values = values.length === 0 ? [null] : values

            filterValues = product(values, filterValues)
          } else {
            filterValues = product([null], filterValues)
          }
        }

        if (filterValues.length === 0) {
          filterValues = [null]
        }

        for (const values of filterValues) {
          sources.push({
            cube: toCubeTerm(data),
            dimensions: properties.map((property, index) => {
              const postfix = values.filter(Boolean).map(term => term.value.split('/').slice(-1)[0]).sort().join('')

              return {
                property: property.term,
                as: postfix ? rdf.namedNode(`${ns.code(property.key).value}${postfix}`) : property.term,
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

    let inList = []

    for (const [key, value] of Object.entries(config)) {
      let func = null

      if (typeof value === 'object' && value.function) {
        switch (value.function) {
          case 'DAY':
            func = Filter.func.day
            break

          case 'MONTH':
            func = Filter.func.month
            break

          case 'YEAR':
            func = Filter.func.year
            break

          default:
            throw new Error(`unknown function : ${value.function}`)
        }
      }

      switch (key) {
        case 'eq':
          view.addFilter(dimension.filter.eq(filterTerm(property, value), { func }))
          break

        case 'gt':
          view.addFilter(dimension.filter.gt(filterTerm(property, value), { func }))
          break

        case 'gte':
          view.addFilter(dimension.filter.gte(filterTerm(property, value), { func }))
          break

        case 'lt':
          view.addFilter(dimension.filter.lt(filterTerm(property, value), { func }))
          break

        case 'lte':
          view.addFilter(dimension.filter.lte(filterTerm(property, value), { func }))
          break

        case 'Hierarchie':
          inList = inList.concat(await this.store.valuesOfHierarchy(value))
          break

        case 'Raumcode':
          inList = inList.concat(value.map(v => ns.code(v)))
          break

        case 'Bezugszeit':
          break

        case 'Periodeende':
          break

        case 'Periodestart':
          break

        case 'Stichtagdatum':
          break

        default:
          throw new Error(`unknown filter type ${key}(${value})`)
      }
    }

    if (inList.length > 0) {
      view.addFilter(dimension.filter.in(inList))
    }
  }
}

export default ViewBuilder
