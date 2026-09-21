/**
 * No-op mail transport for hosts that have not wired a mailer yet.
 */
import type { MailTransport } from '#modules/notification/contracts/index'

export class NoopMailTransport implements MailTransport {
  async sendLater(_message: unknown): Promise<void> {}
}
