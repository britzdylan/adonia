/**
 * Example account routes. Requires controllers (and typically validators)
 * installed via `adonia add account --with-controllers --with-validators`
 * or `--with-stubs`. Wrap with host auth middleware as needed.
 */
import router from '@adonisjs/core/services/router'

const AccountController = () => import('#controllers/account_controller')

router
  .group(() => {
    router.patch('profile', [AccountController, 'updateProfile'])
    router.post('email', [AccountController, 'replaceEmail'])
    router.post('email/confirm', [AccountController, 'confirmEmailChange'])
    router.post('password', [AccountController, 'replacePassword'])
  })
  .prefix('/api/v1/account')
  .as('adonia.account')
