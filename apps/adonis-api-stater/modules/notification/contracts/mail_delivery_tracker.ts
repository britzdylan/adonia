/**
 * Records whether an email reached the mail server, on the host's own
 * record (for example "was the new-order email sent?"). The record is found
 * by the delivery reference the email carries in a header.
 */
export interface MailDeliveryTracker {
  sent(ref: string, sentAt: Date): Promise<void>
  /** Called once, after the last attempt failed. */
  failed(ref: string, error: string): Promise<void>
}
