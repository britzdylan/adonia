/**
 * Host factory for notification. Copied to app/adapters/notification.ts.
 * Import as `#adapters/notification`.
 *
 * Defaults to Adonis Mail + Lucid in-app store. Requires
 * `node ace add @adonisjs/mail` (and Lucid for the app channel).
 */
import { NotificationService } from '#modules/notification/service'
import type { NotificationServiceOptions } from '#modules/notification/options'
import { AdonisMailTransport } from './adonis_mail_transport.ts'
import { LucidAppNotificationStore } from './lucid_app_notification_store.ts'
import type {
  AppNotificationStore,
  MailTransport,
  NotificationRegistry,
} from '#modules/notification/contracts/index'

export { AdonisMailTransport } from './adonis_mail_transport.ts'
export { LucidAppNotificationStore } from './lucid_app_notification_store.ts'

export type CreateNotificationServiceOptions = NotificationServiceOptions & {
  mail?: MailTransport
  appNotifications?: AppNotificationStore
}

export function createNotificationService<R extends NotificationRegistry>(
  registry: R,
  options: CreateNotificationServiceOptions = {}
) {
  return new NotificationService(
    registry,
    options.mail ?? new AdonisMailTransport(),
    options.appNotifications ?? new LucidAppNotificationStore(),
    { onWarn: options.onWarn, onError: options.onError }
  )
}
