import * as FileSystem from 'expo-file-system'

import type { OnboardingData, RealtimeSessionPayload } from '../../domain/models'
import { generateCoachReply } from '../../app/services/appHelpers'

type FileReader = {
  readAsStringAsync: typeof FileSystem.readAsStringAsync
}

type FetchLike = typeof fetch

const coachApiUrl = process.env.EXPO_PUBLIC_COACH_API_URL?.replace(/\/$/, '')

export function isCoachBackendConfigured() {
  return Boolean(coachApiUrl)
}

export async function getCoachReply(
  input: string,
  data: OnboardingData,
  fetchImpl: FetchLike = fetch,
) {
  if (!coachApiUrl) {
    return generateCoachReply(input, data)
  }

  try {
    const response = await fetchImpl(`${coachApiUrl}/api/coach/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input,
        profile: data,
      }),
    })

    if (!response.ok) {
      return generateCoachReply(input, data)
    }

    const payload = (await response.json()) as { reply?: string }
    return payload.reply?.trim() || generateCoachReply(input, data)
  } catch {
    return generateCoachReply(input, data)
  }
}

export async function transcribeAudio(
  uri: string,
  {
    fetchImpl = fetch,
    fileReader = FileSystem,
  }: {
    fetchImpl?: FetchLike
    fileReader?: FileReader
  } = {},
) {
  if (!coachApiUrl) {
    return ''
  }

  try {
    const base64 = await fileReader.readAsStringAsync(uri, {
      encoding: 'base64',
    })

    const response = await fetchImpl(`${coachApiUrl}/api/coach/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64: base64,
      }),
    })

    if (!response.ok) {
      return ''
    }

    const payload = (await response.json()) as { text?: string }
    return payload.text?.trim() || ''
  } catch {
    return ''
  }
}

export async function createRealtimeSession(fetchImpl: FetchLike = fetch) {
  if (!coachApiUrl) {
    return null
  }

  try {
    const response = await fetchImpl(`${coachApiUrl}/api/coach/realtime/session`, {
      method: 'POST',
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as RealtimeSessionPayload
  } catch {
    return null
  }
}
