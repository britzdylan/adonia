/**
 * Lucid AppNotificationStore + InboxStore. Copied to
 * app/adapters/lucid_app_notification_store.ts.
 * Expects a model at #models/app_notification with userId, type, title,
 * body, data, readAt, createdAt.
 */
import { DateTime } from 'luxon'
import AppNotificationModel from '#models/app_notification'
import type {
  AppNotificationData,
  AppNotificationStore,
  InboxNotification,
  InboxStore,
} from '#modules/notification/contracts/index'

function toInboxNotification(row: InstanceType<typeof AppNotificationModel>): InboxNotification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data ?? undefined,
    readAt: row.readAt?.toJSDate() ?? null,
    createdAt: row.createdAt.toJSDate(),
  }
}

export class LucidAppNotificationStore implements AppNotificationStore, InboxStore {
  async create(data: AppNotificationData): Promise<void> {
    await AppNotificationModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data ?? null,
    })
  }

  async listUnread(userId: number, limit: number): Promise<InboxNotification[]> {
    const rows = await AppNotificationModel.query()
      .where('userId', userId)
      .whereNull('readAt')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
    return rows.map(toInboxNotification)
  }

  async countUnread(userId: number): Promise<number> {
    const [row] = await AppNotificationModel.query()
      .where('userId', userId)
      .whereNull('readAt')
      .count('* as total')
    return Number(row.$extras.total)
  }

  async markRead(
    userId: number,
    notificationId: string,
    readAt: Date
  ): Promise<InboxNotification | null> {
    const row = await AppNotificationModel.query()
      .where('id', notificationId)
      .where('userId', userId)
      .first()
    if (!row) return null
    if (!row.readAt) {
      row.readAt = DateTime.fromJSDate(readAt)
      await row.save()
    }
    return toInboxNotification(row)
  }

  async markAllRead(userId: number, readAt: Date): Promise<number> {
    const result = await AppNotificationModel.query()
      .where('userId', userId)
      .whereNull('readAt')
      .update({ readAt: DateTime.fromJSDate(readAt).toSQL() })
    return Number(Array.isArray(result) ? result[0] : result) || 0
  }
}
