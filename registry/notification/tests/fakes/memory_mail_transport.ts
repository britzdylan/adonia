import type { MailTransport } from '#modules/notification/contracts/index'

/**
 * In-memory MailTransport. Optionally throws to simulate mailer outages.
 */
export class MemoryMailTransport implements MailTransport {
  messages: unknown[] = []
  throwOnSend = false

  async sendLater(message: unknown): Promise<void> {
    if (this.throwOnSend) {
      throw new Error('SMTP failure')
    }
    this.messages.push(message)
  }
}
