import { Buffer } from 'node:buffer'

import OpenAI from 'openai'

import type { CoachTextInput } from '../models/coach'
import type { RealtimeSessionResponse } from '../models/realtime'
import type { AudioUpload } from '../models/transcription'

const RECOVERY_COACH_INSTRUCTIONS =
  'You are a concise recovery coach for compulsive porn use and doom scrolling. ' +
  'Be supportive, practical, nonjudgmental, and action-focused. ' +
  'Do not claim to be a licensed therapist. ' +
  'If the user describes self-harm or immediate danger, tell them to contact local emergency services or a crisis line immediately.'

export type OpenAIRepository = {
  createCoachReply: (input: CoachTextInput) => Promise<string>
  transcribeAudio: (upload: AudioUpload) => Promise<string>
  createRealtimeSession: () => Promise<RealtimeSessionResponse>
}

function mapRealtimeClientSecret(session: {
  value: string
  expires_at: number
  session: unknown
}): RealtimeSessionResponse {
  return {
    client_secret: {
      value: session.value,
      expires_at: session.expires_at,
    },
    session: session.session,
  }
}

export class LiveOpenAIRepository implements OpenAIRepository {
  private readonly client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async createCoachReply(input: CoachTextInput) {
    const response = await this.client.responses.create({
      model: 'gpt-5',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: RECOVERY_COACH_INSTRUCTIONS }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                profile: input.profile,
                message: input.message,
              }),
            },
          ],
        },
      ],
      text: {
        verbosity: 'low',
      },
    })

    return response.output_text?.trim() || 'No response generated.'
  }

  async transcribeAudio(upload: AudioUpload) {
    const transcription = await this.client.audio.transcriptions.create({
      file: new File([Buffer.from(upload.bytes)], upload.filename, {
        type: upload.contentType,
      }),
      model: 'gpt-4o-mini-transcribe',
    })

    return transcription.text?.trim() || ''
  }

  async createRealtimeSession() {
    const session = await this.client.realtime.clientSecrets.create({
      session: {
        type: 'realtime',
        model: 'gpt-realtime',
        instructions: RECOVERY_COACH_INSTRUCTIONS,
        audio: {
          input: {
            transcription: {
              model: 'gpt-4o-mini-transcribe',
            },
            turn_detection: {
              type: 'server_vad',
              create_response: true,
              interrupt_response: true,
              silence_duration_ms: 500,
            },
          },
          output: {
            voice: 'marin',
          },
        },
      },
    })

    return mapRealtimeClientSecret(session)
  }
}
