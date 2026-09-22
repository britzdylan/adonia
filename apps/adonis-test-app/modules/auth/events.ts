/**
 * Auth module events. Import this file so the EventsList augmentation loads.
 */
import type { User } from '#modules/contracts/index'

type RequestPasswordReset = {
  user: User
  token: string
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'Auth:RegisterUser': User
    'Auth:CreateNewVerificationToken': User
    'Auth:ActivateUserAccount': User
    'Auth:RequestPasswordReset': RequestPasswordReset
    'Auth:ResetPassword': { user: User }
    'Auth:Login': { user: User }
    'Auth:Logout': null
  }
}
