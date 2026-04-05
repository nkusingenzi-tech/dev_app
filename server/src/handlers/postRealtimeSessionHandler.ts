import { jsonResponse, toErrorResponse } from '../lib/http'
import type { RealtimeSessionService } from '../services/RealtimeSessionService'

export function createPostRealtimeSessionHandler({
  realtimeSessionService,
  origin,
}: {
  realtimeSessionService: RealtimeSessionService
  origin: string
}) {
  return async function postRealtimeSessionHandler() {
    try {
      const response = await realtimeSessionService.createSession()
      return jsonResponse(response, 200, origin)
    } catch (error) {
      return toErrorResponse(error, origin)
    }
  }
}
