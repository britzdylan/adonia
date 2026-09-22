/**
 * Optional account adapters.
 *
 * Reuses shared LucidUserStore. Avatar cleanup defaults to no-op
 * until the host wires Drive / S3.
 */
import { AccountService } from '#modules/account/service'
import { LucidUserStore } from '#modules/adapters/index'
import { NoopAvatarStorage } from './noop_avatar_storage.ts'
import { defaultAccountOptions, type AccountOptions } from '#modules/account/options'
import type { AvatarStorage } from '#modules/account/contracts/index'

export { NoopAvatarStorage } from './noop_avatar_storage.ts'

export function createAccountService(
  avatars: AvatarStorage = new NoopAvatarStorage(),
  options: AccountOptions = defaultAccountOptions
) {
  return new AccountService(new LucidUserStore(), avatars, options)
}
