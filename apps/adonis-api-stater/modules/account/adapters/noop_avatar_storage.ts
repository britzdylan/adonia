/**
 * Optional no-op AvatarStorage for hosts without object storage yet.
 * Replace with a Drive-backed adapter when scaffolding file uploads.
 */
import type { AvatarStorage } from '#modules/account/contracts/index'

export class NoopAvatarStorage implements AvatarStorage {
  async delete(_key: string): Promise<void> {}
}
