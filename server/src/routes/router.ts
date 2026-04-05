import { jsonResponse, noContentResponse } from '../lib/http'

export type RouteDefinition = {
  method: 'GET' | 'POST'
  path: string
  handler: (request: Request) => Promise<Response> | Response
}

export function createRouter({
  origin,
  routes,
}: {
  origin: string
  routes: RouteDefinition[]
}) {
  const routeMap = new Map(routes.map((route) => [`${route.method} ${route.path}`, route.handler]))
  const allowedMethodsByPath = new Map<string, string[]>()

  for (const route of routes) {
    const existing = allowedMethodsByPath.get(route.path) ?? []
    allowedMethodsByPath.set(route.path, [...existing, route.method])
  }

  return async function router(request: Request) {
    const method = request.method.toUpperCase()
    const pathname = new URL(request.url).pathname

    if (method === 'OPTIONS') {
      return noContentResponse(origin)
    }

    const routeHandler = routeMap.get(`${method} ${pathname}`)
    if (routeHandler) {
      return routeHandler(request)
    }

    const allowedMethods = allowedMethodsByPath.get(pathname)
    if (allowedMethods) {
      return jsonResponse(
        { error: `Method ${method} not allowed.` },
        405,
        origin,
        { Allow: allowedMethods.join(', ') },
      )
    }

    return jsonResponse({ error: 'Route not found.' }, 404, origin)
  }
}
