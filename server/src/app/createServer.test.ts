import { describe, expect, test } from 'bun:test'

import { createFakeOpenAIRepository } from '../test-utils/fakes'
import { createServer } from './createServer'

async function request(
  path: string,
  init?: RequestInit,
  overrides?: Parameters<typeof createServer>[0],
) {
  const app = createServer({
    env: {
      port: 8787,
      corsAllowOrigin: '*',
      openAIApiKey: 'sk-test',
    },
    ...overrides,
  })

  return app.fetch(new Request(`http://localhost${path}`, init))
}

describe('createServer', () => {
  test('serves health', async () => {
    const response = await request('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  test('validates the text coach payload', async () => {
    const response = await request('/api/coach/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'message is required' })
  })

  test('returns a typed text coach response shape', async () => {
    const response = await request(
      '/api/coach/text',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Need a reset plan',
          profile: { triggerTime: 'Late night' },
        }),
      },
      { openAIRepository: createFakeOpenAIRepository() },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reply: 'coach:Need a reset plan' })
  })

  test('supports the current JSON base64 transcription contract', async () => {
    const response = await request(
      '/api/coach/transcribe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: 'dGVzdA==' }),
      },
      { openAIRepository: createFakeOpenAIRepository() },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ text: 'transcribed:steady-path-upload.m4a:4' })
  })

  test('preserves raw audio upload support', async () => {
    const response = await request(
      '/api/coach/transcribe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'audio/m4a' },
        body: new Uint8Array([1, 2, 3, 4]),
      },
      { openAIRepository: createFakeOpenAIRepository() },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ text: 'transcribed:steady-path-upload.m4a:4' })
  })

  test('maps realtime sessions to the current mobile contract', async () => {
    const response = await request(
      '/api/coach/realtime/session',
      { method: 'POST' },
      {
        openAIRepository: createFakeOpenAIRepository({
          async createRealtimeSession() {
            return {
              client_secret: { value: 'ek_test_456', expires_at: 999 },
              session: { type: 'realtime' },
            }
          },
        }),
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      client_secret: { value: 'ek_test_456', expires_at: 999 },
      session: { type: 'realtime' },
    })
  })

  test('returns a configured error when the API key is unavailable', async () => {
    const response = await request(
      '/api/coach/text',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Need help' }),
      },
      {
        env: {
          port: 8787,
          corsAllowOrigin: '*',
        },
        openAIRepository: null,
      },
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'OPENAI_API_KEY is not configured on the server.',
    })
  })
})
