/**
 * Outbound email. Host wires Adonis Mail, Resend, SES, etc.
 * Message type is opaque so this contract stays mailer-agnostic.
 */
export interface MailTransport {
  sendLater(message: unknown): Promise<void>
}
