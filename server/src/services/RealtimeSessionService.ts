import { ConfigurationError, UpstreamServiceError } from '../lib/errors'
import type { RealtimeSessionResponse } from '../models/realtime'
import type { OpenAIRepository } from '../repositories/OpenAIRepository'

export class RealtimeSessionService {
  constructor(private readonly openAIRepository: OpenAIRepository | null) {}

  async createSession(): Promise<RealtimeSessionResponse> {
    if (!this.openAIRepository) {
      throw new ConfigurationError('OPENAI_API_KEY is not configured on the server.')
    }

    try {
      return await this.openAIRepository.createRealtimeSession()
    } catch (error) {
      throw new UpstreamServiceError('Failed to create realtime session.', error)
    }
  }
}
