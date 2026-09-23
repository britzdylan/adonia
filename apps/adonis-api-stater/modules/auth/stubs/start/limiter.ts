/**
 * Host example: auth rate limiter (5 requests / minute).
 *
 * Peer: @adonisjs/limiter (not installed by `adonia add auth`).
 * After `node ace add @adonisjs/limiter`, uncomment `.use(authLimiter)`
 * on sensitive routes in start/routes/auth.ts.
 */
import limiter from '@adonisjs/limiter/services/main'

export const authLimiter = limiter.define('auth', () => {
  return limiter.allowRequests(5).every('1 minute')
})
