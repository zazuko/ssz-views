import { resolve } from 'path'
import rdf from 'rdf-ext'
import fromFile from 'rdf-utils-fs/fromFile.js'
import SparqlClient from 'sparql-http-client/ParsingClient.js'
import hierarchyQuery from './queries/hierarchy.js'
import ns from './namespaces.js'

const hierarchies = {
  Geschlechter: [
    ns.code('SEX0001'),
    ns.code('SEX0002')
  ],
  Herkunft: [
    ns.code('HEL1000'),
    ns.code('HEL2000')
  ]
}

class Store {
  constructor ({ baseUrl, endpointUrl, viewPath }) {
    this.baseUrl = baseUrl
    this.client = new SparqlClient({ endpointUrl: endpointUrl })
    this.viewPath = viewPath
  }

  async valuesOfHierarchy (collections) {
    let members = []

    for (const collection of collections) {
      if (collection in hierarchies) {
        members = members.concat(hierarchies[collection])
      } else {
        const query = hierarchyQuery(ns.collection(collection))
        const result = await this.client.query.select(query)

        members = members.concat(result.map(r => r.member))
      }
    }

    return members
  }

  async view (iri) {
    // take the first part of the URL after the base URL to identify the view...
    const pathname = iri.slice(this.baseUrl.length).split('/')[0] || 'index'

    // ...and add .nt to find the file in the view path
    const filename = resolve(this.viewPath, `${pathname}.nt`)

    return rdf.dataset().import(fromFile(filename))
  }
}

export default Store
