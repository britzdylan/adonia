/**
 * Slack and Discord incoming-webhook messages built from user-entered data.
 *
 * Every title, field name and value is escaped for the target's markup, so
 * a user cannot ping `@channel` / `@everyone` or dress up a link in the
 * workspace that receives the message. Long content is cut to each
 * provider's limit.
 */

export type ChatProvider = 'slack' | 'discord'

export const CHAT_PROVIDERS: readonly ChatProvider[] = ['slack', 'discord']

export function isChatProvider(provider: string): provider is ChatProvider {
  return (CHAT_PROVIDERS as readonly string[]).includes(provider)
}

/**
 * The incoming-webhook URLs each provider issues. Accept nothing else, so a
 * "Slack" destination cannot point at an arbitrary server.
 */
const WEBHOOK_URL: Record<ChatProvider, RegExp> = {
  slack: /^https:\/\/hooks\.slack\.com\/(services|workflows|triggers)\/\S+$/,
  discord:
    /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+\/?$/,
}

export function isChatWebhookUrl(provider: ChatProvider, url: string): boolean {
  return WEBHOOK_URL[provider].test(url)
}

export type ChatMessageLimits = {
  /** Fields listed; the rest are counted ("…and 3 more fields"). */
  maxFields: number
  /** Each value is cut to this many characters. */
  maxValueLength: number
}

export const defaultChatMessageLimits: ChatMessageLimits = {
  maxFields: 20,
  maxValueLength: 300,
}

/** Whole-message limits: Discord refuses `content` over 2,000 characters. */
const MAX_LENGTH: Record<ChatProvider, number> = { slack: 3000, discord: 2000 }

export type ChatMessageInput = {
  /** First line, shown in bold. */
  title: string
  /** Name → value. Non-string values are written as JSON. */
  fields?: Record<string, unknown>
  /** A link at the end. The URL is the host's own, not user input. */
  link?: { url: string; label: string }
}

/** The JSON body to POST to the provider's incoming webhook. */
export function buildChatMessage(
  provider: ChatProvider,
  input: ChatMessageInput,
  limits: ChatMessageLimits = defaultChatMessageLimits
): Record<string, unknown> {
  const text = provider === 'slack' ? slackText(input, limits) : discordText(input, limits)
  const limited = truncate(text, MAX_LENGTH[provider])
  if (provider === 'slack') return { text: limited }
  // Even if escaping missed something, no mention in the message pings anyone.
  return { content: limited, allowed_mentions: { parse: [] } }
}

function slackText({ title, fields = {}, link }: ChatMessageInput, limits: ChatMessageLimits) {
  const lines = [`*${escapeSlack(title)}*`]
  for (const [key, value] of fieldsOf(fields, limits)) {
    lines.push(`*${escapeSlack(key)}*: ${escapeSlack(value)}`)
  }
  lines.push(...moreFields(fields, limits))
  if (link) lines.push(`<${link.url}|${escapeSlack(link.label)}>`)
  return lines.join('\n')
}

function discordText({ title, fields = {}, link }: ChatMessageInput, limits: ChatMessageLimits) {
  const lines = [`**${escapeDiscord(title)}**`]
  for (const [key, value] of fieldsOf(fields, limits)) {
    lines.push(`**${escapeDiscord(key)}**: ${escapeDiscord(value)}`)
  }
  lines.push(...moreFields(fields, limits))
  if (link) lines.push(`${escapeDiscord(link.label)}: <${link.url}>`)
  return lines.join('\n')
}

function fieldsOf(fields: Record<string, unknown>, limits: ChatMessageLimits): [string, string][] {
  return Object.entries(fields)
    .slice(0, limits.maxFields)
    .map(([key, value]) => [key, truncate(stringify(value), limits.maxValueLength)])
}

function moreFields(fields: Record<string, unknown>, limits: ChatMessageLimits): string[] {
  const extra = Object.keys(fields).length - limits.maxFields
  if (extra <= 0) return []
  return [`…and ${extra} more ${extra === 1 ? 'field' : 'fields'}`]
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/** Slack treats `<`, `>` and `&` as control characters (`<!channel>`, `<url|label>`). */
export function escapeSlack(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Discord markdown: formatting, masked links, quotes and spoilers. `@` gets
 * a zero-width space after it so `@everyone` and `<@id>` are shown, not used.
 */
export function escapeDiscord(text: string): string {
  return text.replace(/([\\*_~`|>[\]()#-])/g, '\\$1').replace(/@/g, '@\u200b')
}
