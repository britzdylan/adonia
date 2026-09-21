/**
 * NotificationService
 *
 * Channel-agnostic dispatcher. Resolves handlers from a host-supplied registry
 * and fans out to email / in-app transports.
 *
 * Infrastructure (not a domain service) — intentionally does not extend
 * ApiService. Does not own notification types, mail templates, or preferences.
 */
import type {
  AppNotificationStore,
  MailTransport,
  NotificationChannel,
  NotificationRegistry,
} from '#modules/notification/contracts/index'
import type { NotificationServiceOptions } from '#modules/notification/options'

export type ChannelSendStatus = 'sent' | 'skipped' | 'failed'
export type { NotificationServiceOptions } from '#modules/notification/options'

export class NotificationService<R extends NotificationRegistry = NotificationRegistry> {
  private readonly onWarn: (message: string) => void
  private readonly onError: (
    channel: NotificationChannel,
    type: string,
    error: unknown
  ) => void

  constructor(
    private registry: R,
    private mail: MailTransport,
    private appNotifications: AppNotificationStore,
    options: NotificationServiceOptions = {}
  ) {
    this.onWarn = options.onWarn ?? (() => {})
    this.onError = options.onError ?? (() => {})
  }

  /**
   * Dispatch to the requested channels in parallel.
   * Channel failures are isolated and reported via onError + the return map.
   */
  async send<K extends keyof R & string>(
    type: K,
    channels: NotificationChannel[],
    payload: Record<string, any>
  ): Promise<Record<NotificationChannel, ChannelSendStatus>> {
    const status: Record<NotificationChannel, ChannelSendStatus> = {
      email: 'skipped',
      app: 'skipped',
    }

    await Promise.all(
      [...new Set(channels)].map(async (channel) => {
        try {
          status[channel] = await this.dispatch(channel, type, payload)
        } catch (error) {
          this.onError(channel, type, error)
          status[channel] = 'failed'
        }
      })
    )

    return status
  }

  private async dispatch(
    channel: NotificationChannel,
    type: string,
    payload: Record<string, any>
  ): Promise<'sent' | 'skipped'> {
    if (channel === 'email') {
      return this.sendEmail(type, payload)
    }
    return this.sendApp(type, payload)
  }

  private async sendEmail(
    type: string,
    payload: Record<string, any>
  ): Promise<'sent' | 'skipped'> {
    const definition = this.registry[type]
    if (!definition?.email) {
      this.onWarn(`No email handler for notification type: ${type}`)
      return 'skipped'
    }
    await this.mail.sendLater(definition.email(payload))
    return 'sent'
  }

  private async sendApp(
    type: string,
    payload: Record<string, any>
  ): Promise<'sent' | 'skipped'> {
    const definition = this.registry[type]
    if (!definition?.app) {
      this.onWarn(`No app handler for notification type: ${type}`)
      return 'skipped'
    }
    await this.appNotifications.create(definition.app(payload))
    return 'sent'
  }
}
