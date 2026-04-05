import { jsonResponse, toErrorResponse } from '../lib/http'
import { readAudioUploadFromRequest } from '../repositories/AudioUploadRepository'
import type { TranscriptionService } from '../services/TranscriptionService'

export function createPostCoachTranscriptionHandler({
  transcriptionService,
  origin,
}: {
  transcriptionService: TranscriptionService
  origin: string
}) {
  return async function postCoachTranscriptionHandler(request: Request) {
    try {
      const upload = await readAudioUploadFromRequest(request)
      const response = await transcriptionService.transcribe(upload)
      return jsonResponse(response, 200, origin)
    } catch (error) {
      return toErrorResponse(error, origin)
    }
  }
}
