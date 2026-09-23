/**
 * Host Lucid factory for account. Copied to app/adapters/account.ts.
 * Import as `#adapters/account`.
 *
 * Reuses `#adapters/lucid_user_store` from the auth adapter stubs.
 * Avatar cleanup defaults to the portable no-op until the host wires Drive.
 */
import { AccountService } from '#modules/account/service'
import { LucidUserStore } from '#adapters/lucid_user_store'
import { NoopAvatarStorage } from '#modules/account/adapters/noop_avatar_storage'
import { defaultAccountOptions, type AccountOptions } from '#modules/account/options'
import type { AvatarStorage } from '#modules/account/contracts/index'

export function createAccountService(
  avatars: AvatarStorage = new NoopAvatarStorage(),
  options: AccountOptions = defaultAccountOptions
) {
  return new AccountService(new LucidUserStore(), avatars, options)
}
