/**
 * Optional Lucid adapters for the auth module.
 *
 * Shared LucidUserStore lives in #modules/adapters.
 */
import { AuthService } from '#modules/auth/service'
import { LucidUserStore } from '#modules/adapters/index'
import { LucidPasswordResetStore } from './lucid_password_reset_store.ts'
import { defaultAuthOptions, type AuthOptions } from '#modules/auth/options'

export { LucidUserStore } from '#modules/adapters/index'
export { LucidPasswordResetStore } from './lucid_password_reset_store.ts'
export { LucidAccessTokenSession } from './lucid_access_token_session.ts'

export function createAuthService(options: AuthOptions = defaultAuthOptions) {
  return new AuthService(
    new LucidUserStore(),
    new LucidPasswordResetStore(options.passwordResetTokenBytes),
    options
  )
}
