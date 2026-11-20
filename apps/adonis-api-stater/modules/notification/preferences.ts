/**
 * PreferenceAwareNotificationService
 *
 * Wraps the NotificationService dispatcher so an email governed by a user
 * preference is only sent when the user has that preference on. The host
 * maps each notification type to a preference name (or null for "always
 * send"); the module does not own preference names or storage.
 *
 * Optional email is opt-in: anything short of a clear "on" (no numeric
 * `userId` in the payload, an unknown user, a failed lookup) drops the email
 * channel. Other channels are sent as asked.
 *
 * Infrastructure (like NotificationService) — does not extend ApiService.
 */
import type {
  EmailPreferenceMap,
  NotificationChannel,
  NotificationPreferenceStore,
} from '#modules/notification/contracts/index'
import type { NotificationServiceOptions } from '#modules/notification/options'
import type { ChannelSendStatus } from '#modules/notification/service'

type SendResult = Record<NotificationChannel, ChannelSendStatus>

/**
 * Anything with NotificationService's `send`. `K` is the union of
 * notification type names (the registry keys).
 */
export interface NotificationDispatcher<K extends string = string> {
  send(type: K, channels: NotificationChannel[], payload: Record<string, any>): Promise<SendResult>
}

export class PreferenceAwareNotificationService<K extends string = string> {
  private readonly onWarn: (message: string) => void
  private readonly onError: (channel: NotificationChannel, type: string, error: unknown) => void

  constructor(
    private dispatcher: NotificationDispatcher<K>,
    private preferences: NotificationPreferenceStore,
    private emailPreferences: EmailPreferenceMap<NoInfer<K>>,
    options: NotificationServiceOptions = {}
  ) {
    this.onWarn = options.onWarn ?? (() => {})
    this.onError = options.onError ?? (() => {})
  }

  async send(
    type: K,
    channels: NotificationChannel[],
    payload: Record<string, any>
  ): Promise<SendResult> {
    const allowed = await this.allowedChannels(type, channels, payload)
    if (allowed.length === 0) return { email: 'skipped', app: 'skipped' }
    return this.dispatcher.send(type, allowed, payload)
  }

  /** Drops the email channel when the user has turned its preference off. */
  private async allowedChannels(
    type: K,
    channels: NotificationChannel[],
    payload: Record<string, any>
  ): Promise<NotificationChannel[]> {
    const preference = this.emailPreferences[type]
    if (!preference || !channels.includes('email')) return channels

    if (await this.emailWanted(type, preference, payload)) return channels
    return channels.filter((channel) => channel !== 'email')
  }

  private async emailWanted(
    type: string,
    preference: string,
    payload: Record<string, any>
  ): Promise<boolean> {
    const userId = payload.userId
    if (typeof userId !== 'number') {
      this.onWarn(`Optional email "${type}" has no numeric userId in its payload; not sent`)
      return false
    }

    try {
      return (await this.preferences.isEnabled(userId, preference)) === true
    } catch (error) {
      this.onError('email', type, error)
      return false
    }
  }
}
