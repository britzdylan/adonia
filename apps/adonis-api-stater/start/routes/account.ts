/**
 * Account HTTP surface from the account module.
 *
 * Authenticated routes use the named auth middleware. POST email/confirm
 * stays public because the token is in the body. The group is limited
 * to 60 requests per minute.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { accountLimiter } from '#start/limiter'

const AccountController = () => import('#controllers/account_controller')

router
  .group(() => {
    router.get('user', [AccountController, 'getAuthenticatedUser']).use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('adonia.user')
  .use(accountLimiter)

router
  .group(() => {
    router.patch('profile', [AccountController, 'updateProfile']).use(middleware.auth())
    router.post('email', [AccountController, 'replaceEmail']).use(middleware.auth())
    router.post('email/confirm', [AccountController, 'confirmEmailChange'])
    router.post('password', [AccountController, 'replacePassword']).use(middleware.auth())
    router.get('notifications', [AccountController, 'getNotifications']).use(middleware.auth())
    router.put('notifications', [AccountController, 'updateNotifications']).use(middleware.auth())
    router.delete('/', [AccountController, 'deleteAccount']).use(middleware.auth())
    router.get('inbox', [AccountController, 'getInboxNotifications']).use(middleware.auth())
    router
      .post('inbox/read-all', [AccountController, 'markAllNotificationsRead'])
      .use(middleware.auth())
    router.patch('inbox/:id', [AccountController, 'markNotificationRead']).use(middleware.auth())
  })
  .prefix('/api/v1/account')
  .as('adonia.account')
  .use(accountLimiter)
