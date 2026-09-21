import type {
  AppNotificationData,
  AppNotificationStore,
} from '#modules/notification/contracts/index'

/**
 * In-memory AppNotificationStore.
 */
export class MemoryAppNotificationStore implements AppNotificationStore {
  rows: AppNotificationData[] = []
  throwOnCreate = false

  async create(data: AppNotificationData): Promise<void> {
    if (this.throwOnCreate) {
      throw new Error('app notification failure')
    }
    this.rows.push({ ...data })
  }
}
