/**
 * Drive-backed AvatarStorage. Copied to app/adapters/drive_avatar_storage.ts.
 * Requires `@adonisjs/drive` (`node ace add @adonisjs/drive`).
 */
import drive from '@adonisjs/drive/services/main'
import type { AvatarStorage } from '#modules/account/contracts/index'

export class DriveAvatarStorage implements AvatarStorage {
  constructor(private diskName?: string) {}

  async delete(key: string): Promise<void> {
    const disk = this.diskName ? drive.use(this.diskName) : drive.use()
    await disk.delete(key)
  }
}
