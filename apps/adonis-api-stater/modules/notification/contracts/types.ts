/**
 * Notification channel + registry types.
 * Concrete notification types and mail classes stay host-owned.
 */

export type NotificationChannel = 'email' | 'app'

/**
 * Payload written to the in-app notifications store.
 */
export type AppNotificationData = {
  userId: number
  type: string
  title: string
  body: string
  data?: Record<string, any>
}

/**
 * Per-type handlers. Email returns an opaque message for MailTransport;
 * app returns the row shape for AppNotificationStore.
 */
export type NotificationDefinition = {
  email?: (payload: Record<string, any>) => unknown
  app?: (payload: Record<string, any>) => AppNotificationData
}

/**
 * Host-supplied map of notification type → channel handlers.
 * Keys are free-form strings (e.g. 'verify_email', 'welcome').
 */
export type NotificationRegistry = Record<string, NotificationDefinition>
