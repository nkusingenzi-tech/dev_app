export type RealtimeClientSecret = {
  value?: string
  expires_at?: number
}

export type RealtimeSessionResponse = {
  client_secret?: RealtimeClientSecret
  [key: string]: unknown
}
