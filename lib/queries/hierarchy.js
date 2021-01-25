function hierarchy (collection) {
  return `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX schema: <http://schema.org/>

      SELECT * FROM <https://lindas.admin.ch/stadtzuerich/stat> WHERE {
        ?collection skos:member ?member.
        FILTER( ?collection = <${collection.value}>)  

        ?member schema:name ?name;
          schema:position ?score.
      } ORDER BY ?score
    `
}

export default hierarchy
