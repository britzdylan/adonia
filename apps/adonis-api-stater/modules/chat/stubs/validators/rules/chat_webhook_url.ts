/**
 * Vine rule: for a Slack or Discord destination, the URL must be an
 * incoming-webhook URL that provider issues. Copied to
 * app/validators/rules/chat_webhook_url.ts.
 *
 * Reads the provider from a sibling field (default `provider`). Other
 * providers are left to their own rules. Reports
 * `E_VALIDATION_ERROR_CHAT_WEBHOOK_URL`.
 *
 * @example
 * vine.object({
 *   provider: vine.enum(['webhook', 'slack', 'discord']),
 *   url: vine.string().url().use(chatWebhookUrlRule()),
 * })
 */
import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import { isChatProvider, isChatWebhookUrl } from '#modules/chat/message'

export type ChatWebhookUrlOptions = {
  /** Sibling field that holds the provider. Default `provider`. */
  providerField?: string
}

function chatWebhookUrl(
  value: unknown,
  options: ChatWebhookUrlOptions | undefined,
  field: FieldContext
) {
  if (typeof value !== 'string' || !field.isValid) return
  const provider: unknown = field.parent?.[options?.providerField ?? 'provider']
  if (typeof provider !== 'string' || !isChatProvider(provider)) return

  if (!isChatWebhookUrl(provider, value)) {
    field.report('E_VALIDATION_ERROR_CHAT_WEBHOOK_URL', 'chatWebhookUrl', field)
  }
}

export const chatWebhookUrlRule = vine.createRule(chatWebhookUrl)
