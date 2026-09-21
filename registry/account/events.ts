/**
 * Account module events. Import this file so the EventsList augmentation loads.
 */
import type { User } from '#modules/contracts/index'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'Account:UpdateUserProfile': User
    'Account:UpdateUserEmail': { user: User; newEmail: string }
    'Account:ConfirmEmailChange': User
    'Account:UpdateUserPassword': User
    'Account:DeleteAccount': { userId: number }
  }
}
