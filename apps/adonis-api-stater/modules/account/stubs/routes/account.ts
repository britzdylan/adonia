/**
 * Example account routes. Requires controllers (and typically validators)
 * installed via `adonia add account --with-controllers --with-validators`
 * or `--with-stubs`.
 *
 * Copy Vine provider (`providers/vine_provider.ts`) and register it in
 * adonisrc.ts. Authenticated routes need named auth middleware from
 * start/kernel.ts. POST email/confirm is public (token in the body).
 * Inbox routes need `adonia add notification --with-models`.
 *
 * Account routes should use accountLimiter (60/min). Install
 * @adonisjs/limiter, copy stubs/start/limiter.ts, then uncomment
 * `.use(accountLimiter)` below.
 */
import router from '@adonisjs/core/services/router'
// import { middleware } from '#start/kernel'
// import { accountLimiter } from '#start/limiter'

const AccountController = () => import('#controllers/account_controller')

router
  .group(() => {
    router.get('user', [AccountController, 'getAuthenticatedUser'])
    // .use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('adonia.user')

router
  .group(() => {
    router.patch('profile', [AccountController, 'updateProfile'])
    // .use(middleware.auth())
    router.post('email', [AccountController, 'replaceEmail'])
    // .use(middleware.auth())
    router.post('email/confirm', [AccountController, 'confirmEmailChange'])
    router.post('password', [AccountController, 'replacePassword'])
    // .use(middleware.auth())
    router.get('notifications', [AccountController, 'getNotifications'])
    // .use(middleware.auth())
    router.put('notifications', [AccountController, 'updateNotifications'])
    // .use(middleware.auth())
    router.delete('/', [AccountController, 'deleteAccount'])
    // .use(middleware.auth())
    router.get('inbox', [AccountController, 'getInboxNotifications'])
    // .use(middleware.auth())
    router.post('inbox/read-all', [AccountController, 'markAllNotificationsRead'])
    // .use(middleware.auth())
    router.patch('inbox/:id', [AccountController, 'markNotificationRead'])
    // .use(middleware.auth())
  })
  .prefix('/api/v1/account')
  .as('adonia.account')
  // .use(accountLimiter)
