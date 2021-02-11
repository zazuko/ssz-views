import { resolve } from 'path'
import rdf from 'rdf-ext'
import fromFile from 'rdf-utils-fs/fromFile.js'

class FileStore {
  constructor ({ baseUrl, viewPath }) {
    this.baseUrl = baseUrl
    this.viewPath = viewPath
  }

  async view (iri) {
    // take the first part of the URL after the base URL to identify the view...
    const pathname = iri.slice(this.baseUrl.length).split('/')[0] || 'index'

    // ...and add .nt to find the file in the view path
    const filename = resolve(this.viewPath, `${pathname}.nt`)

    return rdf.dataset().import(fromFile(filename))
  }
}

export default FileStore
