import type { CoachTextInput } from '../models/coach'
import type { RealtimeSessionResponse } from '../models/realtime'
import type { AudioUpload } from '../models/transcription'
import type { OpenAIRepository } from '../repositories/OpenAIRepository'

export function createFakeOpenAIRepository(
  overrides: Partial<OpenAIRepository> = {},
): OpenAIRepository {
  return {
    async createCoachReply(input: CoachTextInput) {
      return `coach:${input.message}`
    },
    async transcribeAudio(upload: AudioUpload) {
      return `transcribed:${upload.filename}:${upload.bytes.byteLength}`
    },
    async createRealtimeSession(): Promise<RealtimeSessionResponse> {
      return {
        client_secret: {
          value: 'ek_test_123',
          expires_at: 1234567890,
        },
        session: {
          type: 'realtime',
        },
      }
    },
    ...overrides,
  }
}
