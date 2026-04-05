import { ConfigurationError, UpstreamServiceError } from '../lib/errors'
import type { TranscriptionResponse, AudioUpload } from '../models/transcription'
import type { OpenAIRepository } from '../repositories/OpenAIRepository'

export class TranscriptionService {
  constructor(private readonly openAIRepository: OpenAIRepository | null) {}

  async transcribe(upload: AudioUpload): Promise<TranscriptionResponse> {
    if (!this.openAIRepository) {
      throw new ConfigurationError('OPENAI_API_KEY is not configured on the server.')
    }

    try {
      const text = await this.openAIRepository.transcribeAudio(upload)
      return { text }
    } catch (error) {
      throw new UpstreamServiceError('Failed to transcribe audio.', error)
    }
  }
}
