/**
 * Reads a user's notification preferences. Preference names are host-owned
 * strings (for example a users column such as `emailWeeklyDigest`).
 */
export interface NotificationPreferenceStore {
  /**
   * True only when the user exists and has the preference turned on.
   * An unknown user or an unknown preference returns false.
   */
  isEnabled(userId: number, preference: string): Promise<boolean>
}
