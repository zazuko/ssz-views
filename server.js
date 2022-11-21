import absoluteUrl from 'absolute-url'
import express from 'express'
import middleware from './index.js'
import morgan from 'morgan'

const config = {
  baseUrl: process.env.BASE_URL,
  endpointUrl: process.env.ENDPOINT_URL,
  endpointAuthentication: {
    user: process.env.ENDPOINT_USER,
    password: process.env.ENDPOINT_PASSWORD
  },
  viewEndpointUrl: process.env.VIEW_ENDPOINT_URL,
  viewEndpointAuthentication: {
    user: process.env.VIEW_ENDPOINT_USER,
    password: process.env.VIEW_ENDPOINT_PASSWORD
  },
  port: parseInt(process.env.PORT || 8080),
  viewPath: process.env.VIEW_PATH || 'views'
}

async function main () {
  const app = express()

  app.set('trust proxy', true)
  app.use(morgan('combined'))
  app.use(absoluteUrl())
  app.use((new URL(config.baseUrl)).pathname, await middleware(config))

  app.listen(config.port, () => {
    console.log(`listening at http://:${config.port}`)
  })
}

main()
