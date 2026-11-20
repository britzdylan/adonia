/**
 * Account module input types.
 * User persistence uses shared #modules/contracts UserStore / User.
 */
import type { User } from '#modules/contracts/index'

export type UpdateProfileInput = {
  firstName?: string
  lastName?: string
  /**
   * New avatar storage key after the host uploaded the file.
   * Pass null to clear. Omit to leave unchanged.
   */
  avatarKey?: string | null
}

export type ReplaceEmailInput = {
  email: string
}

/**
 * A step that must succeed before an account is closed, for example
 * cancelling billing. When `run` throws, the account is not deleted.
 * Host or other modules supply these (see the subscription module's
 * `cancelSubscriptionsOnClose`).
 */
export type AccountClosureStep = {
  /** Short name for logs and errors, for example `subscriptions`. */
  name: string
  run(user: User): Promise<void>
}

export type ReplacePasswordInput = {
  currentPassword: string
  newPassword: string
}
