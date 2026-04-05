import { jsonResponse } from '../lib/http'

export function createGetHealthHandler(origin: string) {
  return function getHealthHandler() {
    return jsonResponse({ ok: true }, 200, origin)
  }
}
