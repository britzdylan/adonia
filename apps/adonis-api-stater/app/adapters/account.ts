/**
 * Host Lucid factory for account. Copied to app/adapters/account.ts.
 * Import as `#adapters/account`.
 *
 * Reuses `#adapters/lucid_user_store` from the auth adapter stubs.
 * Avatar cleanup uses Drive (`node ace add @adonisjs/drive`).
 */
import { AccountService } from '#modules/account/service'
import { LucidUserStore } from '#adapters/lucid_user_store'
import { DriveAvatarStorage } from './drive_avatar_storage.ts'
import { defaultAccountOptions, type AccountOptions } from '#modules/account/options'
import type { AvatarStorage } from '#modules/account/contracts/index'

export { DriveAvatarStorage } from './drive_avatar_storage.ts'

export function createAccountService(
  avatars: AvatarStorage = new DriveAvatarStorage(),
  options: AccountOptions = defaultAccountOptions
) {
  return new AccountService(new LucidUserStore(), avatars, options)
}
