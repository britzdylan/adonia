/**
 * Lucid NotificationPreferenceStore. Copied to
 * app/adapters/lucid_notification_preference_store.ts.
 *
 * Reads a boolean column on the users table by its model attribute name
 * (for example `emailWeeklyDigest` on the auth module's User stub). Only
 * names in `allowed` are read, so a preference name can never select an
 * arbitrary attribute.
 */
import User from '#models/user'
import type { NotificationPreferenceStore } from '#modules/notification/contracts/index'

export class LucidNotificationPreferenceStore implements NotificationPreferenceStore {
  constructor(private allowed: readonly string[]) {}

  async isEnabled(userId: number, preference: string): Promise<boolean> {
    if (!this.allowed.includes(preference)) return false
    const user = await User.find(userId)
    if (!user) return false
    const value = (user as unknown as Record<string, unknown>)[preference]
    // SQLite and MySQL return booleans as 1 / 0.
    return value === true || value === 1
  }
}
