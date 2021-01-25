#!/usr/bin/env node

import fs from 'fs/promises'
import { resolve } from 'path'
import clownface from 'clownface'
import program from 'commander'
import rdf from 'rdf-ext'
import toFile from 'rdf-utils-fs/toFile.js'
import ns from '../lib/namespaces.js'
import ViewBuilder from '../lib/builder/ViewBuilder.js'

program
  .command('generate <filename> [output]')
  .option('-e, --endpoint [url]', 'SPARQL endpoint URL')
  .option('-g, --graph [url]', 'Named Graph')
  .option('-u, --user [user]', 'user for SPARQL endpoint')
  .option('-p, --password [password]', 'password for SPARQL endpoint')
  .option('-b, --base [url]', 'base URL for the views')
  .action(async (filename, output = process.cwd(), { base: baseUrl, endpoint: endpointUrl, graph: graphUrl, user, password }) => {
    const builder = new ViewBuilder({ baseUrl, endpointUrl, graphUrl, user, password })

    const configs = JSON.parse((await fs.readFile(filename)).toString())
    let index = clownface({ dataset: rdf.dataset(), term: rdf.blankNode() })

    if (baseUrl) {
      index = index.node(index.namedNode(baseUrl))
    }

    for (const config of configs) {
      for (const publication of config['Veröffentlichung']) {
        const id = publication['VeröffentlichungID']
        const view = await builder.build(config, id)

        const outputFilename = resolve(output, `${id}.nt`)
        const dataset = view.ptr.dataset.filter(quad => quad.object.termType !== 'DefaultGraph')

        await toFile(dataset.toStream(), outputFilename)

        index.addOut(ns.hydra.member, view.ptr)
      }
    }

    await toFile(index.dataset.toStream(), resolve(output, 'index.nt'))
  })

program.parse(process.argv)
