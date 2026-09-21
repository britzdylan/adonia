import type { NotificationChannel } from '#modules/notification/contracts/index'

/**
 * Constructor options for NotificationService.
 */
export type NotificationServiceOptions = {
  /** Called when a channel has no handler for the given type. Default: no-op. */
  onWarn?: (message: string) => void
  /** Called when a channel handler throws. Default: no-op. */
  onError?: (channel: NotificationChannel, type: string, error: unknown) => void
}
