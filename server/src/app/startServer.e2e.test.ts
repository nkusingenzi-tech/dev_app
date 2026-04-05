import { createServer as createNetServer } from 'node:net'

import { afterEach, describe, expect, test } from 'bun:test'

import { createFakeOpenAIRepository } from '../test-utils/fakes'
import { createServer } from './createServer'
import { startServer, type BunServerLike } from './startServer'

let activeServer: BunServerLike | null = null

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve an open test port.'))
        return
      }

      const { port } = address
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve(port)
      })
    })
  })
}

async function startTestServer(fetch: (request: Request) => Response | Promise<Response>) {
  const port = await findAvailablePort()
  return startServer({
    port,
    fetch,
  })
}

afterEach(() => {
  activeServer?.stop(true)
  activeServer = null
})

describe('server e2e', () => {
  test('serves the coach API over real HTTP', async () => {
    const app = createServer({
      env: {
        port: 8787,
        corsAllowOrigin: '*',
        openAIApiKey: 'sk-test',
      },
      openAIRepository: createFakeOpenAIRepository(),
    })

    activeServer = await startTestServer(app.fetch)

    const healthResponse = await fetch(`http://127.0.0.1:${activeServer.port}/health`)
    expect(healthResponse.status).toBe(200)
    expect(await healthResponse.json()).toEqual({ ok: true })

    const textResponse = await fetch(`http://127.0.0.1:${activeServer.port}/api/coach/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Need help tonight',
        profile: { triggerTime: 'Late night' },
      }),
    })
    expect(textResponse.status).toBe(200)
    expect(await textResponse.json()).toEqual({ reply: 'coach:Need help tonight' })

    const transcriptionResponse = await fetch(
      `http://127.0.0.1:${activeServer.port}/api/coach/transcribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: 'dGVzdA==' }),
      },
    )
    expect(transcriptionResponse.status).toBe(200)
    expect(await transcriptionResponse.json()).toEqual({
      text: 'transcribed:steady-path-upload.m4a:4',
    })

    const realtimeResponse = await fetch(
      `http://127.0.0.1:${activeServer.port}/api/coach/realtime/session`,
      {
        method: 'POST',
      },
    )
    expect(realtimeResponse.status).toBe(200)
    expect(await realtimeResponse.json()).toEqual({
      client_secret: { value: 'ek_test_123', expires_at: 1234567890 },
      session: { type: 'realtime' },
    })
  })
})
