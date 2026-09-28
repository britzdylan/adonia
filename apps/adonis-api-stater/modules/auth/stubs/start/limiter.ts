/**
 * Host example rate limiters.
 *
 * Peer: @adonisjs/limiter (not installed by `adonia add`).
 * After `node ace add @adonisjs/limiter`, uncomment `.use(authLimiter)`
 * on sensitive auth routes and `.use(accountLimiter)` on the account
 * group in start/routes/account.ts.
 */
import limiter from '@adonisjs/limiter/services/main'

export const authLimiter = limiter.define('auth', () => {
  return limiter.allowRequests(5).every('1 minute')
})

export const accountLimiter = limiter.define('account', () => {
  return limiter.allowRequests(60).every('1 minute')
})
