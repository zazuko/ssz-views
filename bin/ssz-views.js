#!/usr/bin/env node

import fs from 'fs/promises'
import { resolve } from 'path'
import clownface from 'clownface'
import program from 'commander'
import rdf from 'rdf-ext'
import toFile from 'rdf-utils-fs/toFile.js'
import ns from '../lib/namespaces.js'
import DatasetBuilder from '../lib/builder/DatasetBuilder.js'
import ViewBuilder from '../lib/builder/ViewBuilder.js'

async function generateDataset ({ config, datasetBuilder, index, output }) {
  const id = config.DataSetMetadaten.DataSetID
  const outputFilename = resolve(output, `${id}.nt`)
  const dataset = await datasetBuilder.build(config.DataSetMetadaten)

  await toFile(dataset.dataset.toStream(), outputFilename)

  index
    .addOut(ns.hydra.member, dataset)
}

async function generatePublication ({ config, index, output, publication, viewBuilder }) {
  const id = publication['VeröffentlichungID']
  const outputFilename = resolve(output, `${id}.nt`)
  const view = await viewBuilder.build(config, id)

  view.ptr
    .addOut(ns.cube.observations, rdf.namedNode(`${view.ptr.value}/observation/`))

  const dataset = view.ptr.dataset.filter(quad => quad.object.termType !== 'DefaultGraph')

  await toFile(dataset.toStream(), outputFilename)

  index
    .addOut(ns.hydra.member, view.ptr)

  // add types to index
  index.node(view.ptr)
    .addOut(ns.rdf.type, ns.view.View)
    .addOut(ns.rdf.type, ns.cube.Cube)
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
      await generateDataset({ config, datasetBuilder, index, output })

      for (const publication of config['Veröffentlichung']) {
        await generatePublication({ config, index, publication, output, viewBuilder })
      }
    }

    await toFile(index.dataset.toStream(), resolve(output, 'index.nt'))
  })

program.parse(process.argv)
