# ssz-views

## Generate Views

Views are pre-generated based on the exported JSON files.
A command line tool is provided for this step.
The tool must be called like this:

```bash
./bin/ssz-views.js generate --endpoint=http://ld.zazuko.com/query --base=http://localhost:8080/ config.json views
```

The endpoint argument is used to lookup hierarchies on the SPARQL endpoint.
The given base will be used as base URL for the views.
It must match the URL that will be used for the server.
`config.json` is the input file and `views` the output folder.

## View Server

The view server hosts the generated views and runs them on the fly.
Content negotiation can be used to fetch the results in RDF serializations or CSV.  
The following URL patterns are used:

- `GET /`: Returns an index of all views pointing to the views using `hydra:member`. 
- `GET /:viewId`: Returns the triples of the generated view.
  The `viewId` matches the `Veröffentlichung/VeröffentlichungID` from the json config.
- `GET /:viewId/observation/`: Returns the on the fly generated observations based on the view definition with the given `viewId`.

### Examples

The following `curl` request will fetch the view `V000001` as CSV and store it in `test.csv`:

```bash
curl -v -H 'accept: text/csv' http://localhost:8080/V000001/observation/ > test.csv
```

The following `curl` request will fetch the view `V000001` as N-Triples and store it in `test.nt`:

```bash
curl -v -H 'accept: application/n-triples' http://localhost:8080/V000001/observation/ > test.nt
```
