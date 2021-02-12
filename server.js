import absoluteUrl from 'absolute-url'
import express from 'express'
import middleware from './index.js'
import morgan from 'morgan'

const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8080/',
  endpointUrl: process.env.ENDPOINT_URL || 'http://ld.zazuko.com/query',
  viewEndpointUrl: process.env.VIEW_ENDPOINT_URL,
  port: parseInt(process.env.PORT || 8080),
  viewPath: process.env.VIEW_PATH || 'views'
}

async function main () {
  const app = express()

  app.use(morgan('combined'))
  app.use(absoluteUrl())
  app.use((new URL(config.baseUrl)).pathname, await middleware(config))

  app.listen(config.port, () => {
    console.log(`listening at http://:${config.port}`)
  })
}

main()
