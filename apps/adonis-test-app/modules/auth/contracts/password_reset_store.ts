import type { User } from '#modules/contracts/index'
import type { AuthPasswordReset, TokenDuration } from './types.ts'

/**
 * Host must implement this for password-reset flows.
 */
export interface PasswordResetStore {
  /** Invalidate existing reset rows for the user, then create a new token. */
  createForUser(userId: number, duration: TokenDuration): Promise<AuthPasswordReset>

  findByToken(token: string): Promise<AuthPasswordReset | null>

  deleteForUser(userId: number): Promise<void>

  /** Rotate/replace the token with a new expiry window. */
  refreshToken(reset: AuthPasswordReset, duration: TokenDuration): Promise<AuthPasswordReset>

  findUserByReset(reset: AuthPasswordReset): Promise<User>
}

export type { AuthPasswordReset, TokenDuration }
