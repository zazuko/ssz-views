import namespace from '@rdfjs/namespace'

const ns = {
  cube: namespace('https://cube.link/'),
  hydra: namespace('http://www.w3.org/ns/hydra/core#'),
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  schema: namespace('http://schema.org/'),
  view: namespace('https://cube.link/view/'),
  xsd: namespace('http://www.w3.org/2001/XMLSchema#'),

  scube: namespace('https://ld.stadt-zuerich.ch/statistics/'),
  code: namespace('https://ld.stadt-zuerich.ch/statistics/code/'),
  collection: namespace('https://ld.stadt-zuerich.ch/statistics/collection/'),
  measure: namespace('https://ld.stadt-zuerich.ch/statistics/measure/'),
  property: namespace('https://ld.stadt-zuerich.ch/statistics/property/'),
  sschema: namespace('https://ld.stadt-zuerich.ch/schema/')
}

export default ns
