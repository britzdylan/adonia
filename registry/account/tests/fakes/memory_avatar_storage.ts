import type { AvatarStorage } from '#modules/account/contracts/index'

/**
 * In-memory AvatarStorage that records deleted keys.
 */
export class MemoryAvatarStorage implements AvatarStorage {
  deleted: string[] = []

  async delete(key: string): Promise<void> {
    this.deleted.push(key)
  }
}
