import { ConfigurationError, ValidationError, UpstreamServiceError } from '../lib/errors'
import type { CoachProfile, CoachTextInput, CoachTextRequest, CoachTextResponse } from '../models/coach'
import { emptyCoachProfile } from '../models/coach'
import type { OpenAIRepository } from '../repositories/OpenAIRepository'

const MAX_MESSAGE_LENGTH = 4000
const MAX_PROFILE_FIELD_LENGTH = 400

function sanitizeProfileField(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_PROFILE_FIELD_LENGTH) : ''
}

export function sanitizeCoachProfile(value: unknown): CoachProfile {
  const profile = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    primaryGoal: sanitizeProfileField(profile.primaryGoal),
    motivation: sanitizeProfileField(profile.motivation),
    triggerTime: sanitizeProfileField(profile.triggerTime),
    riskyApps: sanitizeProfileField(profile.riskyApps),
    accountabilityContact: sanitizeProfileField(profile.accountabilityContact),
    reminderTime: sanitizeProfileField(profile.reminderTime),
  }
}

export function parseCoachTextRequest(value: unknown): CoachTextInput {
  const payload = value && typeof value === 'object' ? (value as CoachTextRequest) : {}
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''

  if (!message) {
    throw new ValidationError('message is required')
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`)
  }

  return {
    message,
    profile: payload.profile ? sanitizeCoachProfile(payload.profile) : emptyCoachProfile,
  }
}

export class CoachService {
  constructor(private readonly openAIRepository: OpenAIRepository | null) {}

  async createReply(input: CoachTextInput): Promise<CoachTextResponse> {
    if (!this.openAIRepository) {
      throw new ConfigurationError('OPENAI_API_KEY is not configured on the server.')
    }

    try {
      const reply = await this.openAIRepository.createCoachReply(input)
      return {
        reply: reply || 'No response generated.',
      }
    } catch (error) {
      throw new UpstreamServiceError('Failed to generate coach response.', error)
    }
  }
}
