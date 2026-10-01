/**
 * Example auth routes. Requires controllers (and typically validators)
 * installed via `adonia add auth --with-controllers --with-validators`
 * or `--with-stubs`.
 *
 * Copy Vine provider (`providers/vine_provider.ts`) and register it in
 * adonisrc.ts. Logout needs named auth middleware from start/kernel.ts.
 *
 * Sensitive routes should use authLimiter (5/min). Install @adonisjs/limiter,
 * copy stubs/start/limiter.ts, then uncomment `.use(authLimiter)` below.
 */
import router from '@adonisjs/core/services/router'
// import { middleware } from '#start/kernel'
// import { authLimiter } from '#start/limiter'

const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('register', [AuthController, 'register'])
    // .use(authLimiter)
    router.post('login', [AuthController, 'login'])
    // .use(authLimiter)
    router.post('logout', [AuthController, 'logout'])
    // .use(middleware.auth())
    router.post('activate', [AuthController, 'activate'])
    router.post('activate/request', [AuthController, 'sendAccountActivationEmail'])
    // .use(authLimiter)
    router.post('password/forgot', [AuthController, 'requestPasswordReset'])
    // .use(authLimiter)
    router.post('password/validate', [AuthController, 'validatePasswordReset'])
    router.post('password/reset', [AuthController, 'updatePassword'])
    // .use(authLimiter)
  })
  .prefix('/api/v1/auth')
  .as('adonia.auth')
