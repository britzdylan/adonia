/**
 * Forces `Accept: application/json` so framework errors (validation, auth)
 * render as JSON, and keeps the Accept header the client sent, so a route
 * can still answer a browser with HTML (`clientAcceptsHtml`).
 *
 * Register in start/kernel.ts in place of the starter kit's middleware:
 *
 *   server.use([() => import('#modules/api/force_json_middleware'), ...])
 */
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type Request = HttpContext['request']

const originalAccept = new WeakMap<Request, string | undefined>()

/** The Accept header the request arrived with, before it was forced. */
export function originalAcceptHeader(request: Request): string | undefined {
  return originalAccept.has(request) ? originalAccept.get(request) : request.header('accept')
}

/**
 * True when the client asked for HTML by name (with a q-value above 0), as
 * a browser does when it navigates or posts a plain HTML form. Scripts
 * using fetch send no Accept header or a wildcard, and get false.
 */
export function acceptsHtml(accept: string | undefined): boolean {
  return (accept ?? '').split(',').some((part) => {
    const [type, ...params] = part.trim().toLowerCase().split(';')
    if (type.trim() !== 'text/html') return false
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
    return q === undefined || Number(q.slice(2)) > 0
  })
}

export function clientAcceptsHtml(request: Request): boolean {
  return acceptsHtml(originalAcceptHeader(request))
}

export default class ForceJsonResponseMiddleware {
  handle({ request }: HttpContext, next: NextFn) {
    const headers = request.request.headers
    originalAccept.set(request, headers.accept)
    headers.accept = 'application/json'
    return next()
  }
}
