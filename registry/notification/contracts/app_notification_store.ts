import type { AppNotificationData } from './types.ts'

/**
 * Persist in-app notifications. Host wires Lucid / Drizzle / etc.
 */
export interface AppNotificationStore {
  create(data: AppNotificationData): Promise<void>
}
