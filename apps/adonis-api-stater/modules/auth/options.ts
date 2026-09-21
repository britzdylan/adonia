import type { TokenDuration } from '#modules/auth/contracts/index'

/**
 * Host-editable defaults for AuthService.
 * Do not read env here — pass values in when constructing the service.
 */
export type AuthOptions = {
  /** Duration passed to encryption.encrypt for email verification tokens. */
  verificationTtl: string
  /** Lifetime of a newly requested password-reset token. */
  passwordResetTtl: TokenDuration
  /** Lifetime after validatePasswordResetToken rotates the token. */
  passwordResetValidateTtl: TokenDuration
  /** Byte length for string.generateRandom in LucidPasswordResetStore. */
  passwordResetTokenBytes: number
}

export const defaultAuthOptions: AuthOptions = {
  verificationTtl: '2 Hours',
  passwordResetTtl: { hours: 2 },
  passwordResetValidateTtl: { minutes: 5 },
  passwordResetTokenBytes: 40,
}
