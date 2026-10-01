/**
 * Host Lucid factory for auth. Copied to app/adapters/auth.ts.
 * Import as `#adapters/auth`.
 */
import { AuthService } from '#modules/auth/service'
import { LucidUserStore } from './lucid_user_store.ts'
import { LucidPasswordResetStore } from './lucid_password_reset_store.ts'
import { defaultAuthOptions, type AuthOptions } from '#modules/auth/options'

export { LucidUserStore } from './lucid_user_store.ts'
export { LucidPasswordResetStore } from './lucid_password_reset_store.ts'
export { LucidAccessTokenSession } from './lucid_access_token_session.ts'
export { toUser } from './map_user.ts'

export function createAuthService(options: AuthOptions = defaultAuthOptions) {
  return new AuthService(
    new LucidUserStore(),
    new LucidPasswordResetStore(options.passwordResetTokenBytes),
    options
  )
}
