import clownface from 'clownface'
import rdf from 'rdf-ext'
import ns from '../namespaces.js'
import { resolve } from 'path'

class DatasetBuilder {
  constructor ({ baseUrl }) {
    this.baseUrl = baseUrl
  }

  async build (config) {
    const iri = new URL(this.baseUrl)
    iri.pathname = resolve(iri.pathname, config.DataSetID)

    const metadata = clownface({ dataset: rdf.dataset(), term: rdf.namedNode(iri) })
      .addOut(ns.schema.identifier, rdf.literal(config.DataSetID))
      .addOut(ns.schema.name, rdf.literal(config.DataSetTitel))
      .addOut(ns.schema.temporalCoverage, rdf.literal(config.DataSetZeitspanne))
      .addOut(ns.schema.sourceOrganization, rdf.literal(config.DataSetQuelle))

    for (const keyword of config.DataSetSchlagworte) {
      metadata.addOut(ns.schema.keywords, rdf.literal(keyword))
    }

    return metadata
  }
}

export default DatasetBuilder
