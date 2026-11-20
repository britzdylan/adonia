/**
 * Host rate limiters.
 *
 * Peer: @adonisjs/limiter (not installed by `adonia add`).
 * After `node ace add @adonisjs/limiter`, uncomment the `.use(...)` lines in
 * start/routes/auth.ts and start/routes/account.ts.
 *
 * Every limiter is off in tests (`app.inTest`), so suites do not trip them.
 * The rate-limit error renders through the API envelope as
 * E_TOO_MANY_REQUESTS, with `Retry-After` and `X-RateLimit-*` headers.
 */
import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

/** Per IP. Sensitive auth routes: login, register, password reset. */
export const authLimiter = limiter.define('auth', () => {
  if (app.inTest) return limiter.noLimit()
  return limiter.allowRequests(5).every('1 minute')
})

/**
 * Per signed-in user, with the IP as the fallback. Keyed by user so people
 * behind one office IP do not share a budget. Use after `middleware.auth()`.
 */
export const accountLimiter = limiter.define('account', (ctx) => {
  if (app.inTest) return limiter.noLimit()
  return limiter.allowRequests(60).every('1 minute').usingKey(userOrIpKey('account', ctx))
})

/**
 * Per target address, for routes that send an email to an address in the
 * request (password reset, resend verification). Rotating IPs cannot flood
 * one inbox. Use together with authLimiter for the per-IP limit.
 */
export const emailTargetLimiter = limiter.define('email_target', (ctx) => {
  if (app.inTest) return limiter.noLimit()
  const target = String(ctx.params.email ?? ctx.request.input('email', 'unknown'))
    .trim()
    .toLowerCase()
  return limiter.allowRequests(3).every('15 minutes').usingKey(`email_target|${target}`)
})

/**
 * Per route parameter and IP, for public endpoints that take a resource id
 * (for example a public form or webhook endpoint). Each resource gets its own
 * budget, so one abusive client cannot use up another resource's limit.
 *
 * @example
 * export const publicSubmitLimiter = perResourceLimiter('submit', 'formId', 30)
 */
export function perResourceLimiter(name: string, param: string, requestsPerMinute: number) {
  return limiter.define(name, (ctx) => {
    if (app.inTest) return limiter.noLimit()
    const resource = String(ctx.params[param] ?? 'unknown')
    return limiter
      .allowRequests(requestsPerMinute)
      .every('1 minute')
      .usingKey(`${name}|${resource}|${ctx.request.ip()}`)
  })
}

function userOrIpKey(name: string, ctx: HttpContext): string {
  const userId = (ctx as { auth?: { user?: { id?: unknown } } }).auth?.user?.id
  return userId ? `${name}|user_${userId}` : `${name}|ip_${ctx.request.ip()}`
}
