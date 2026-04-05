import { Buffer } from 'node:buffer'

import { PayloadTooLargeError, ValidationError } from '../lib/errors'
import { getContentType, MAX_AUDIO_BYTES, MAX_JSON_BYTES, readJsonBody, readRequestBytes } from '../lib/http'
import type { AudioUpload, TranscriptionJsonRequest } from '../models/transcription'

const DEFAULT_AUDIO_CONTENT_TYPE = 'audio/m4a'

function inferFileExtension(contentType: string) {
  switch (contentType) {
    case 'audio/mp4':
    case 'audio/m4a':
      return '.m4a'
    case 'audio/mpeg':
      return '.mp3'
    case 'audio/wav':
    case 'audio/x-wav':
      return '.wav'
    case 'audio/webm':
      return '.webm'
    default:
      return '.m4a'
  }
}

function decodeBase64Audio(value: string) {
  try {
    return new Uint8Array(Buffer.from(value, 'base64'))
  } catch (error) {
    throw new ValidationError('audioBase64 must be valid base64 audio data.', error)
  }
}

// Support both raw `audio/*` uploads and the app's current JSON `{ audioBase64 }` contract.
export async function readAudioUploadFromRequest(request: Request): Promise<AudioUpload> {
  const contentType = getContentType(request)

  if (contentType.startsWith('audio/')) {
    const bytes = await readRequestBytes(request, MAX_AUDIO_BYTES)
    if (bytes.byteLength === 0) {
      throw new ValidationError('audio body is required')
    }

    return {
      bytes,
      contentType,
      filename: `steady-path-upload${inferFileExtension(contentType)}`,
    }
  }

  const payload = await readJsonBody<TranscriptionJsonRequest>(request, MAX_JSON_BYTES)
  if (typeof payload.audioBase64 !== 'string' || payload.audioBase64.trim().length === 0) {
    throw new ValidationError('audio body is required')
  }

  const bytes = decodeBase64Audio(payload.audioBase64.trim())
  if (bytes.byteLength === 0) {
    throw new ValidationError('audio body is required')
  }

  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new PayloadTooLargeError(`Decoded audio exceeds the ${MAX_AUDIO_BYTES} byte limit.`)
  }

  return {
    bytes,
    contentType: DEFAULT_AUDIO_CONTENT_TYPE,
    filename: 'steady-path-upload.m4a',
  }
}
