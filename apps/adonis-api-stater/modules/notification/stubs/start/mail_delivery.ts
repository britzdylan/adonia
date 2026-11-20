/**
 * Sends queued mail (`mail.sendLater`) with retries and records delivery.
 * Copied to start/mail_delivery.ts. Preload it in adonisrc.ts:
 *
 *   preloads: [..., () => import('#start/mail_delivery')]
 *
 * Replace `tracker` with one that writes to your own records; it gets the
 * value of the `X-Delivery-Ref` header the mail class sets. Mail is kept in
 * memory: with @adonisjs/queue, call `sendTracked` from a job instead.
 */
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import { createTrackedMessenger } from '#modules/notification/delivery'
import type { MailDeliveryTracker } from '#modules/notification/contracts/index'

const tracker: MailDeliveryTracker = {
  async sent(ref) {
    logger.info({ ref }, 'Email sent')
  },
  async failed(ref, error) {
    logger.error({ ref, error }, 'Email failed after all attempts')
  },
}

mail.setMessenger((mailer) =>
  createTrackedMessenger(mailer, tracker, {
    attempts: 3,
    onError: (err, ref) => logger.error({ err, ref }, 'Email delivery error'),
  })
)
