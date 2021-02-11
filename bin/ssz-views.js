#!/usr/bin/env node

import fs from 'fs/promises'
import { resolve } from 'path'
import clownface from 'clownface'
import program from 'commander'
import rdf from 'rdf-ext'
import toFile from 'rdf-utils-fs/toFile.js'
import SparqlClient from 'sparql-http-client'
import ns from '../lib/namespaces.js'
import DatasetBuilder from '../lib/builder/DatasetBuilder.js'
import ViewBuilder from '../lib/builder/ViewBuilder.js'

async function generateDataset ({ config, datasetBuilder, index, output = '' }) {
  const id = config.DataSetMetadaten.DataSetID
  const outputFilename = resolve(output, `${id}.nt`)
  const dataset = await datasetBuilder.build(config.DataSetMetadaten)

  index
    .addOut(ns.hydra.member, dataset)

  return {
    dataset: dataset.dataset,
    outputFilename
  }
}

async function generatePublication ({ config, index, output = '', publication, viewBuilder }) {
  const id = publication['VeröffentlichungID']
  const outputFilename = resolve(output, `${id}.nt`)
  const view = await viewBuilder.build(config, id)

  view.ptr
    .addOut(ns.cube.observations, rdf.namedNode(`${view.ptr.value}/observation/`))

  const dataset = view.ptr.dataset.filter(quad => quad.object.termType !== 'DefaultGraph')

  index
    .addOut(ns.hydra.member, view.ptr)

  // add types to index
  index.node(view.ptr)
    .addOut(ns.rdf.type, ns.view.View)
    .addOut(ns.rdf.type, ns.cube.Cube)

  return {
    dataset,
    outputFilename
  }
}

async function toStore (dataset, { graph, storeUrl, user, password }) {
  const client = new SparqlClient({ storeUrl, user, password })

  if (graph) {
    graph = rdf.namedNode(graph)
  }

  client.store.post(rdf.dataset(dataset, graph).toStream())
}

program
  .command('generate <filename> [output]')
  .option('-e, --endpoint [url]', 'SPARQL endpoint URL')
  .option('-g, --graph [url]', 'Named Graph')
  .option('-u, --user [user]', 'user for SPARQL endpoint')
  .option('-p, --password [password]', 'password for SPARQL endpoint')
  .option('-b, --base [url]', 'base URL for the views')
  .action(async (filename, output = process.cwd(), { base: baseUrl, endpoint: endpointUrl, graph: graphUrl, user, password }) => {
    const datasetBuilder = new DatasetBuilder({ baseUrl })
    const viewBuilder = new ViewBuilder({ baseUrl, endpointUrl, graphUrl, user, password })

    const configs = JSON.parse((await fs.readFile(filename)).toString())
    let index = clownface({ dataset: rdf.dataset(), term: rdf.blankNode() })

    if (baseUrl) {
      index = index.node(index.namedNode(baseUrl))
    }

    for (const config of configs) {
      const { dataset, outputFilename } = await generateDataset({ config, datasetBuilder, index, output })
      await toFile(dataset.toStream(), outputFilename)

      for (const publication of config['Veröffentlichung']) {
        const { dataset, outputFilename } = await generatePublication({ config, index, publication, output, viewBuilder })
        await toFile(dataset.toStream(), outputFilename)
      }
    }

    await toFile(index.dataset.toStream(), resolve(output, 'index.nt'))
  })

program
  .command('generate2store <filename> <outputUrl>')
  .option('-e, --endpoint [url]', 'SPARQL endpoint URL')
  .option('-g, --graph [url]', 'Named Graph')
  .option('-u, --user [user]', 'user for SPARQL endpoint')
  .option('-p, --password [password]', 'password for SPARQL endpoint')
  .option('-b, --base [url]', 'base URL for the views')
  .option('--output-user [user]', 'user for SPARQL endpoint for output')
  .option('--output-password [password]', 'password for SPARQL endpoint for output')
  .option('--output-graph [graph]', 'graph for SPARQL endpoint for output')
  .action(async (filename, outputUrl, { base: baseUrl, endpoint: endpointUrl, graph: graphUrl, user, password, outputUser, outputPassword, outputGraph }) => {
    const datasetBuilder = new DatasetBuilder({ baseUrl })
    const viewBuilder = new ViewBuilder({ baseUrl, endpointUrl, graphUrl, user, password })

    const configs = JSON.parse((await fs.readFile(filename)).toString())
    let index = clownface({ dataset: rdf.dataset(), term: rdf.blankNode() })

    if (baseUrl) {
      index = index.node(index.namedNode(baseUrl))
    }

    for (const config of configs) {
      const { dataset } = await generateDataset({ config, datasetBuilder, index })
      await toStore(dataset, {
        storeUrl: outputUrl,
        user: outputUser,
        password: outputPassword,
        graph: outputGraph
      })

      for (const publication of config['Veröffentlichung']) {
        const { dataset } = await generatePublication({ config, index, publication, viewBuilder })
        await toStore(dataset, {
          storeUrl: outputUrl,
          user: outputUser,
          password: outputPassword,
          graph: outputGraph
        })
      }
    }

    await toStore(index.dataset, {
      storeUrl: outputUrl,
      user: outputUser,
      password: outputPassword,
      graph: outputGraph
    })
  })

program.parse(process.argv)
