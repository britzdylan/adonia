/**
 * Who an email is addressed to. Mail classes take this instead of a Lucid
 * model, so they can be built from the user DTO that module events carry
 * (for example `Auth:RegisterUser`, `Account:Closed`).
 */
export type MailRecipient = {
  email: string
  /** Full name, or null when the user has none. */
  name: string | null
}

type Named = { email: string; firstName?: string | null; lastName?: string | null }

export function toMailRecipient(user: Named): MailRecipient {
  const name = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return { email: user.email, name: name || null }
}

/**
 * The value for a mail `to` field: `"Ada Lovelace" <ada@example.com>`, or
 * the bare address without a name. Quotes and backslashes in the name are
 * escaped, and line breaks removed, so a name cannot add headers.
 */
export function formatMailAddress(recipient: MailRecipient): string {
  if (!recipient.name) return recipient.email
  const name = recipient.name.replace(/[\r\n]+/g, ' ').replace(/(["\\])/g, '\\$1')
  return `"${name}" <${recipient.email}>`
}
