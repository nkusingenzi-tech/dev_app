import { MAX_JSON_BYTES, jsonResponse, readJsonBody, toErrorResponse } from '../lib/http'
import { parseCoachTextRequest, type CoachService } from '../services/CoachService'

export function createPostCoachTextHandler({
  coachService,
  origin,
}: {
  coachService: CoachService
  origin: string
}) {
  return async function postCoachTextHandler(request: Request) {
    try {
      const payload = await readJsonBody<unknown>(request, MAX_JSON_BYTES)
      const response = await coachService.createReply(parseCoachTextRequest(payload))
      return jsonResponse(response, 200, origin)
    } catch (error) {
      return toErrorResponse(error, origin)
    }
  }
}
