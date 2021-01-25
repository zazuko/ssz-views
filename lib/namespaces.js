import namespace from '@rdfjs/namespace'

const ns = {
  cube: namespace('http://ns.bergnet.org/cube/'),
  hydra: namespace('http://www.w3.org/ns/hydra/core#'),
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  view: namespace('http://ns.bergnet.org/cube-view/'),
  xsd: namespace('http://www.w3.org/2001/XMLSchema#'),

  scube: namespace('https://ld.stadt-zuerich.ch/statistics/'),
  code: namespace('https://ld.stadt-zuerich.ch/statistics/code/'),
  collection: namespace('https://ld.stadt-zuerich.ch/statistics/collection/'),
  measure: namespace('https://ld.stadt-zuerich.ch/statistics/measure/'),
  property: namespace('https://ld.stadt-zuerich.ch/statistics/property/'),
  sschema: namespace('https://ld.stadt-zuerich.ch/schema/')
}

export default ns
