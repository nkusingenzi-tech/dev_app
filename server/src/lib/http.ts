import { HttpError, PayloadTooLargeError, ValidationError } from './errors'

export const MAX_JSON_BYTES = 35 * 1024 * 1024
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const textDecoder = new TextDecoder()

export function buildCorsHeaders(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  })
}

export function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
  origin = '*',
  extraHeaders?: Record<string, string>,
) {
  const headers = buildCorsHeaders(origin)
  headers.set('Content-Type', 'application/json; charset=utf-8')

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value)
    }
  }

  return new Response(JSON.stringify(payload), { status, headers })
}

export function noContentResponse(origin = '*', status = 204, extraHeaders?: Record<string, string>) {
  const headers = buildCorsHeaders(origin)

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value)
    }
  }

  return new Response(null, { status, headers })
}

export function getContentType(request: Request) {
  return request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
}

// Read the entire body once, while enforcing a hard size ceiling before downstream parsing.
export async function readRequestBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PayloadTooLargeError(`Request body exceeds the ${maxBytes} byte limit.`)
  }

  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.byteLength > maxBytes) {
    throw new PayloadTooLargeError(`Request body exceeds the ${maxBytes} byte limit.`)
  }

  return bytes
}

export async function readJsonBody<T>(request: Request, maxBytes = MAX_JSON_BYTES): Promise<T> {
  const bytes = await readRequestBytes(request, maxBytes)
  if (bytes.byteLength === 0) {
    return {} as T
  }

  const rawBody = textDecoder.decode(bytes)

  try {
    return JSON.parse(rawBody) as T
  } catch (error) {
    throw new ValidationError('Request body must be valid JSON.', error)
  }
}

export function toErrorResponse(error: unknown, origin = '*') {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status, origin)
  }

  console.error(error)
  return jsonResponse({ error: 'Internal server error.' }, 500, origin)
}
