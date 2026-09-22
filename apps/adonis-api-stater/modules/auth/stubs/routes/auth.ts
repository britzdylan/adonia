/**
 * Example auth routes. Requires controllers (and typically validators)
 * installed via `adonia add auth --with-controllers --with-validators`
 * or `--with-stubs`.
 */
import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('register', [AuthController, 'register'])
    router.post('login', [AuthController, 'login'])
    router.post('activate', [AuthController, 'activate'])
    router.post('password/forgot', [AuthController, 'requestPasswordReset'])
    router.post('password/reset', [AuthController, 'updatePassword'])
  })
  .prefix('/api/v1/auth')
  .as('adonia.auth')
