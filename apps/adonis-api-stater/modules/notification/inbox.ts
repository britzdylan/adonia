/**
 * InboxService
 *
 * The user's in-app notification inbox: unread list, unread count, mark one
 * or all read. Reads go through the InboxStore port; writes of new
 * notifications stay with NotificationService and AppNotificationStore.
 * Returns DTOs; controllers build the HTTP envelope.
 */
import ApiService from '#modules/api/service'
import ApiException from '#modules/api/exception'
import { exceptions } from '#constants/exceptions'
import type { InboxNotification, InboxStore } from '#modules/notification/contracts/index'

export type Inbox = {
  notifications: InboxNotification[]
  unreadCount: number
}

export type InboxOptions = {
  /** Most unread notifications returned by getInbox. */
  pageSize: number
}

export const defaultInboxOptions: InboxOptions = {
  pageSize: 50,
}

export class InboxService extends ApiService {
  namespace = 'notification'

  constructor(
    private inbox: InboxStore,
    private options: InboxOptions = defaultInboxOptions,
    private now: () => Date = () => new Date()
  ) {
    super()
  }

  async getInbox(userId: number): Promise<Inbox> {
    const [notifications, unreadCount] = await Promise.all([
      this.inbox.listUnread(userId, this.options.pageSize),
      this.inbox.countUnread(userId),
    ])
    return { notifications, unreadCount }
  }

  /**
   * Throws E_NOTIFICATION_NOT_FOUND when the user has no notification with
   * that id, including one that belongs to another user.
   */
  async markRead(userId: number, notificationId: string): Promise<InboxNotification> {
    const notification = await this.inbox.markRead(userId, notificationId, this.now())
    if (!notification) {
      throw ApiException.from(exceptions.NOTIFICATION_NOT_FOUND)
    }
    return notification
  }

  async markAllRead(userId: number): Promise<number> {
    return this.inbox.markAllRead(userId, this.now())
  }
}
