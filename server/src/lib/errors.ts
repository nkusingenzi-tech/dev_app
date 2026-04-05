export class HttpError extends Error {
  readonly status: number
  readonly expose: boolean

  constructor(status: number, message: string, options?: { expose?: boolean; cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'HttpError'
    this.status = status
    this.expose = options?.expose ?? true
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, cause?: unknown) {
    super(400, message, { cause })
    this.name = 'ValidationError'
  }
}

export class PayloadTooLargeError extends HttpError {
  constructor(message: string) {
    super(413, message)
    this.name = 'PayloadTooLargeError'
  }
}

export class UnsupportedMediaTypeError extends HttpError {
  constructor(message: string) {
    super(415, message)
    this.name = 'UnsupportedMediaTypeError'
  }
}

export class ConfigurationError extends HttpError {
  constructor(message: string) {
    super(500, message)
    this.name = 'ConfigurationError'
  }
}

export class UpstreamServiceError extends HttpError {
  constructor(message: string, cause?: unknown) {
    super(500, message, { cause, expose: true })
    this.name = 'UpstreamServiceError'
  }
}
