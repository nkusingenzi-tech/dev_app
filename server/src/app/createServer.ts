import type { ServerEnv } from '../config/env'
import { loadEnv } from '../config/env'
import { createGetHealthHandler } from '../handlers/getHealthHandler'
import { createPostCoachTextHandler } from '../handlers/postCoachTextHandler'
import { createPostCoachTranscriptionHandler } from '../handlers/postCoachTranscriptionHandler'
import { createPostRealtimeSessionHandler } from '../handlers/postRealtimeSessionHandler'
import type { OpenAIRepository } from '../repositories/OpenAIRepository'
import { LiveOpenAIRepository } from '../repositories/OpenAIRepository'
import { createRouter } from '../routes/router'
import { CoachService } from '../services/CoachService'
import { RealtimeSessionService } from '../services/RealtimeSessionService'
import { TranscriptionService } from '../services/TranscriptionService'

export type ServerApp = {
  env: ServerEnv
  fetch: (request: Request) => Promise<Response> | Response
}

export function createServer({
  env = loadEnv(),
  openAIRepository,
}: {
  env?: ServerEnv
  openAIRepository?: OpenAIRepository | null
} = {}): ServerApp {
  const repository =
    openAIRepository !== undefined
      ? openAIRepository
      : env.openAIApiKey
        ? new LiveOpenAIRepository(env.openAIApiKey)
        : null

  const coachService = new CoachService(repository)
  const transcriptionService = new TranscriptionService(repository)
  const realtimeSessionService = new RealtimeSessionService(repository)

  const fetch = createRouter({
    origin: env.corsAllowOrigin,
    routes: [
      {
        method: 'GET',
        path: '/health',
        handler: createGetHealthHandler(env.corsAllowOrigin),
      },
      {
        method: 'POST',
        path: '/api/coach/text',
        handler: createPostCoachTextHandler({
          coachService,
          origin: env.corsAllowOrigin,
        }),
      },
      {
        method: 'POST',
        path: '/api/coach/transcribe',
        handler: createPostCoachTranscriptionHandler({
          transcriptionService,
          origin: env.corsAllowOrigin,
        }),
      },
      {
        method: 'POST',
        path: '/api/coach/realtime/session',
        handler: createPostRealtimeSessionHandler({
          realtimeSessionService,
          origin: env.corsAllowOrigin,
        }),
      },
    ],
  })

  return { env, fetch }
}
