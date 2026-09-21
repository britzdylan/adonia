/**
 * Optional notification adapters.
 *
 * Host supplies the notification registry (types + mail/app builders).
 * Transports default to no-ops until mail / notifications table are wired.
 *
 * Wire Adonis Mail with a one-liner MailTransport:
 *   { sendLater: (msg) => mail.sendLater(msg as BaseMail) }
 */
import { NotificationService } from '#modules/notification/service'
import type { NotificationServiceOptions } from '#modules/notification/options'
import { NoopMailTransport } from './noop_mail_transport.ts'
import { NoopAppNotificationStore } from './noop_app_notification_store.ts'
import type {
  AppNotificationStore,
  MailTransport,
  NotificationRegistry,
} from '#modules/notification/contracts/index'

export { NoopMailTransport } from './noop_mail_transport.ts'
export { NoopAppNotificationStore } from './noop_app_notification_store.ts'
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
    options.mail ?? new NoopMailTransport(),
    options.appNotifications ?? new NoopAppNotificationStore(),
    { onWarn: options.onWarn, onError: options.onError }
  )
}
