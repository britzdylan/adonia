/**
 * Adonis Mail transport. Copied to app/adapters/adonis_mail_transport.ts.
 * Requires `@adonisjs/mail` (`node ace add @adonisjs/mail`).
 *
 * Registry email builders must return whatever `mail.sendLater` accepts
 * (a BaseMail instance or a message callback).
 */
import mail from '@adonisjs/mail/services/main'
import type { MailTransport } from '#modules/notification/contracts/index'

export class AdonisMailTransport implements MailTransport {
  async sendLater(message: unknown): Promise<void> {
    await mail.sendLater(message as Parameters<typeof mail.sendLater>[0])
  }
}
