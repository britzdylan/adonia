/**
 * No-op in-app store for hosts without a notifications table yet.
 */
import type {
  AppNotificationData,
  AppNotificationStore,
} from '#modules/notification/contracts/index'

export class NoopAppNotificationStore implements AppNotificationStore {
  async create(_data: AppNotificationData): Promise<void> {}
}
