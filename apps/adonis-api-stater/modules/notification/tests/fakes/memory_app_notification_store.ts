import type {
  AppNotificationData,
  AppNotificationStore,
  InboxNotification,
  InboxStore,
} from '#modules/notification/contracts/index'

/**
 * In-memory AppNotificationStore + InboxStore.
 */
export class MemoryAppNotificationStore implements AppNotificationStore, InboxStore {
  rows: AppNotificationData[] = []
  inbox: InboxNotification[] = []
  throwOnCreate = false
  private nextId = 1

  async create(data: AppNotificationData): Promise<void> {
    if (this.throwOnCreate) {
      throw new Error('app notification failure')
    }
    this.rows.push({ ...data })
    this.inbox.push({
      ...data,
      id: String(this.nextId++),
      readAt: null,
      createdAt: new Date(Date.now() + this.nextId),
    })
  }

  async listUnread(userId: number, limit: number): Promise<InboxNotification[]> {
    return this.unread(userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async countUnread(userId: number): Promise<number> {
    return this.unread(userId).length
  }

  async markRead(
    userId: number,
    notificationId: string,
    readAt: Date
  ): Promise<InboxNotification | null> {
    const row = this.inbox.find((n) => n.id === notificationId && n.userId === userId)
    if (!row) return null
    row.readAt ??= readAt
    return row
  }

  async markAllRead(userId: number, readAt: Date): Promise<number> {
    const unread = this.unread(userId)
    for (const row of unread) row.readAt = readAt
    return unread.length
  }

  private unread(userId: number) {
    return this.inbox.filter((n) => n.userId === userId && n.readAt === null)
  }
}
