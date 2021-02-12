import rdf from 'rdf-ext'
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
  constructor ({ baseUrl, endpointUrl, user, password, viewPath }) {
    this.baseUrl = baseUrl
    this.client = new SparqlClient({ endpointUrl, user, password })
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
    const pathname = iri.slice(this.baseUrl.length).split('/')[0]
    const url = [this.baseUrl, pathname].join('')

    const query = `#pragma describe.strategy cbd\nDESCRIBE <${url}>`

    return rdf.dataset(await this.client.query.construct(query))
  }
}

export default Store
