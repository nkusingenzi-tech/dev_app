export type BunServerLike = {
  port: number
  stop: (closeActiveConnections?: boolean) => void
}

type BunRuntimeLike = {
  serve: (options: {
    port: number
    fetch: (request: Request) => Response | Promise<Response>
  }) => BunServerLike
}

function getBunRuntime(): BunRuntimeLike {
  const runtime = (globalThis as typeof globalThis & { Bun?: BunRuntimeLike }).Bun
  if (!runtime) {
    throw new Error('Bun runtime is required to start the coach API server.')
  }

  return runtime
}

export function startServer({
  port,
  fetch,
}: {
  port: number
  fetch: (request: Request) => Response | Promise<Response>
}) {
  return getBunRuntime().serve({
    port,
    fetch,
  })
}
