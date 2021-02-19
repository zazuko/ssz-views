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

async function readConfig (filename) {
  const raw = await fs.readFile(filename)
  let content = raw.toString()

  // TODO: workaround for bom header
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1)
  }

  // TODO: workaround for invalid JSON ' -> "
  content = content.replace(/'/g, '"')

  return JSON.parse(content)
}

async function generateDataset ({ config, datasetBuilder, index, output = '' }) {
  const id = config.DataSetMetadaten.DataSetID
  const outputFilename = resolve(output, `${id}.nt`)
  const dataset = await datasetBuilder.build(config.DataSetMetadaten)

  index
    .addOut(ns.schema.hasPart, dataset)

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
    .addOut(ns.schema.dataset, view.ptr)

  return {
    dataset,
    outputFilename
  }
}

async function toStore (dataset, { clear, graph, storeUrl, user, password }) {
  const client = new SparqlClient({ storeUrl, user, password })

  if (graph) {
    graph = rdf.namedNode(graph)
  }

  if (clear) {
    client.store.put(rdf.dataset(dataset, graph).toStream())
  } else {
    client.store.post(rdf.dataset(dataset, graph).toStream())
  }
}

program
  .command('generate <filename> [output]')
  .option('-e, --endpoint [url]', 'SPARQL endpoint URL')
  .option('-g, --graph [url]', 'Named Graph')
  .option('-u, --user [user]', 'user for SPARQL endpoint')
  .option('-p, --password [password]', 'password for SPARQL endpoint')
  .option('-b, --base [url]', 'base URL for the views')
  .option('-i, --index [url]', 'index URL where the views will be attached')
  .action(async (filename, output = process.cwd(), { base: baseUrl, endpoint: endpointUrl, graph: graphUrl, index: indexUrl, user, password }) => {
    const datasetBuilder = new DatasetBuilder({ baseUrl })
    const viewBuilder = new ViewBuilder({ baseUrl, endpointUrl, graphUrl, user, password })

    const configs = await readConfig(filename)
    let index = clownface({ dataset: rdf.dataset(), term: rdf.blankNode() })

    if (baseUrl) {
      index = index.node(index.namedNode(baseUrl))
    }

    if (indexUrl) {
      index = index.node(index.namedNode(indexUrl))
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
  .option('-i, --index [url]', 'index URL where the views will be attached')
  .option('--output-user [user]', 'user for SPARQL endpoint for output')
  .option('--output-password [password]', 'password for SPARQL endpoint for output')
  .option('--output-graph [graph]', 'graph for SPARQL endpoint for output')
  .option('--output-clear', 'clear existing triples in graph')
  .action(async (filename, outputUrl, { base: baseUrl, endpoint: endpointUrl, graph: graphUrl, ndex: indexUrl, user, password, outputUser, outputPassword, outputGraph, outputClear }) => {
    const datasetBuilder = new DatasetBuilder({ baseUrl })
    const viewBuilder = new ViewBuilder({ baseUrl, endpointUrl, graphUrl, user, password })

    const configs = await readConfig(filename)
    const all = rdf.dataset()
    let index = clownface({ dataset: rdf.dataset(), term: rdf.blankNode() })

    if (baseUrl) {
      index = index.node(index.namedNode(baseUrl))
    }

    if (indexUrl) {
      index = index.node(index.namedNode(indexUrl))
    }

    for (const config of configs) {
      const { dataset } = await generateDataset({ config, datasetBuilder, index })

      all.addAll(dataset)

      for (const publication of config['Veröffentlichung']) {
        const { dataset } = await generatePublication({ config, index, publication, viewBuilder })

        all.addAll(dataset)
      }
    }

    all.addAll(index.dataset)

    await toStore(all, {
      storeUrl: outputUrl,
      user: outputUser,
      password: outputPassword,
      graph: outputGraph,
      clear: outputClear
    })
  })

program.parse(process.argv)
