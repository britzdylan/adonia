import type { InboxNotification } from './types.ts'

/**
 * Read side of the in-app notifications. Host wires Lucid / Drizzle / etc.
 * Every method is scoped to the user, so one user can never read or mark
 * another user's notification.
 */
export interface InboxStore {
  /** Unread notifications of the user, newest first, at most `limit`. */
  listUnread(userId: number, limit: number): Promise<InboxNotification[]>

  countUnread(userId: number): Promise<number>

  /**
   * Marks one of the user's notifications read at `readAt` (keeps an
   * earlier readAt) and returns it, or null when the user has no
   * notification with that id.
   */
  markRead(userId: number, notificationId: string, readAt: Date): Promise<InboxNotification | null>

  /** Marks every unread notification of the user read. Returns how many. */
  markAllRead(userId: number, readAt: Date): Promise<number>
}
