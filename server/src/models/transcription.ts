export type AudioUpload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

export type TranscriptionJsonRequest = {
  audioBase64?: unknown
}

export type TranscriptionResponse = {
  text: string
}
