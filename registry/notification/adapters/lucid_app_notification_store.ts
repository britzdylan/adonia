/**
 * Optional Lucid AppNotificationStore.
 * Expects a model at #models/app_notification (or #models/notification) with
 * userId, type, title, body, data columns.
 */
import AppNotificationModel from '#models/app_notification'
import type {
  AppNotificationData,
  AppNotificationStore,
} from '#modules/notification/contracts/index'

export class LucidAppNotificationStore implements AppNotificationStore {
  async create(data: AppNotificationData): Promise<void> {
    await AppNotificationModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data ?? null,
    })
  }
}
