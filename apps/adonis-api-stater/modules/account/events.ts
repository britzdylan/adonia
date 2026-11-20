/**
 * Account module events. Import this file so the EventsList augmentation loads.
 */
import type { User } from '#modules/contracts/index'

type AccountClosed = {
  userId: number
  email: string
  firstName: string
  lastName: string
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'Account:UpdateUserProfile': User
    'Account:UpdateUserEmail': { user: User; newEmail: string }
    'Account:ConfirmEmailChange': User
    'Account:UpdateUserPassword': User
    'Account:DeleteAccount': { userId: number }
    /**
     * After closeAccount. Carries the address because the user row is
     * already gone, so a listener can still send a confirmation email.
     */
    'Account:Closed': AccountClosed
  }
}
