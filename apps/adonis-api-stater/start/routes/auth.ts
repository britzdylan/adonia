/**
 * Auth HTTP surface from the auth module.
 *
 * Vine macros load from providers/vine_provider.ts. Logout requires
 * the named auth middleware. Sensitive routes use authLimiter (5/min).
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { authLimiter } from '#start/limiter'

const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('register', [AuthController, 'register']).use(authLimiter)
    router.post('login', [AuthController, 'login']).use(authLimiter)
    router
      .post('logout', [AuthController, 'logout'])
      .use(middleware.auth())
      .use(authLimiter)
    router.post('activate', [AuthController, 'activate'])
    router
      .post('activate/request', [AuthController, 'sendAccountActivationEmail'])
      .use(authLimiter)
    router.post('password/forgot', [AuthController, 'requestPasswordReset']).use(authLimiter)
    router.post('password/validate', [AuthController, 'validatePasswordReset'])
    router.post('password/reset', [AuthController, 'updatePassword']).use(authLimiter)
  })
  .prefix('/api/v1/auth')
  .as('adonia.auth')
