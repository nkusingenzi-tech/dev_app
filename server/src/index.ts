import { createServer } from './app/createServer'
import { startServer } from './app/startServer'
import { loadEnv } from './config/env'

const env = loadEnv()
const app = createServer({ env })
const server = startServer({
  port: env.port,
  fetch: app.fetch,
})

console.log(`Coach API listening on http://localhost:${server.port}`)
