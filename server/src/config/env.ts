export type ServerEnv = {
  port: number
  openAIApiKey?: string
  corsAllowOrigin: string
}

const DEFAULT_PORT = 8787

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_PORT
  }

  return parsed
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const openAIApiKey = env.OPENAI_API_KEY?.trim() || undefined
  const corsAllowOrigin = env.CORS_ALLOW_ORIGIN?.trim() || '*'

  return {
    port: parsePort(env.PORT),
    openAIApiKey,
    corsAllowOrigin,
  }
}
