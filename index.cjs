// common js wrapper for trifid
async function factory (config) {
  const middlware = await import('./index.js')

  return middlware.default(config)
}

module.exports = factory
