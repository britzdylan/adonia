/**
 * Host factory for notification. Copied to app/adapters/notification.ts.
 * Import as `#adapters/notification`.
 *
 * Defaults to Adonis Mail + Lucid in-app store. Requires
 * `node ace add @adonisjs/mail` (and Lucid for the app channel).
 */
import { NotificationService } from '#modules/notification/service'
import { PreferenceAwareNotificationService } from '#modules/notification/preferences'
import { InboxService, defaultInboxOptions, type InboxOptions } from '#modules/notification/inbox'
import type { NotificationServiceOptions } from '#modules/notification/options'
import { AdonisMailTransport } from './adonis_mail_transport.ts'
import { LucidAppNotificationStore } from './lucid_app_notification_store.ts'
import { LucidNotificationPreferenceStore } from './lucid_notification_preference_store.ts'
import type {
  AppNotificationStore,
  EmailPreferenceMap,
  InboxStore,
  MailTransport,
  NotificationPreferenceStore,
  NotificationRegistry,
} from '#modules/notification/contracts/index'

export { AdonisMailTransport } from './adonis_mail_transport.ts'
export { LucidAppNotificationStore } from './lucid_app_notification_store.ts'
export { LucidNotificationPreferenceStore } from './lucid_notification_preference_store.ts'

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

/**
 * NotificationService that drops an email when the user turned off the
 * preference that governs it. `emailPreferences` maps a notification type to
 * a users column (or null for "always send"); only the columns named there
 * are read.
 *
 * @example
 * export default createPreferenceAwareNotificationService(registry, {
 *   weekly_digest: 'emailWeeklyDigest',
 *   product_update: 'emailProductUpdates',
 * })
 */
export function createPreferenceAwareNotificationService<R extends NotificationRegistry>(
  registry: R,
  emailPreferences: EmailPreferenceMap<keyof R & string>,
  options: CreateNotificationServiceOptions & { preferences?: NotificationPreferenceStore } = {}
) {
  const allowed = Object.values(emailPreferences).filter(
    (preference): preference is string => typeof preference === 'string'
  )
  return new PreferenceAwareNotificationService(
    createNotificationService(registry, options),
    options.preferences ?? new LucidNotificationPreferenceStore(allowed),
    emailPreferences,
    { onWarn: options.onWarn, onError: options.onError }
  )
}

/** The user's in-app inbox over the Lucid notifications table. */
export function createInboxService(
  store: InboxStore = new LucidAppNotificationStore(),
  options: InboxOptions = defaultInboxOptions
) {
  return new InboxService(store, options)
}
