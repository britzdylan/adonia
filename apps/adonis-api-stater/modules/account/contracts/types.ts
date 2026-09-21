/**
 * Account module input types.
 * User persistence uses shared #modules/contracts UserStore / User.
 */

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

export type ReplacePasswordInput = {
  currentPassword: string
  newPassword: string
}
