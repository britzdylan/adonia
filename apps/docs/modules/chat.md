# chat

`chat` sends Slack and Discord incoming-webhook messages built from
user-entered data, without letting that data ping a channel or fake a
link.

| Field | Value |
|-------|-------|
| Depends on | `api`, [`outbound`](./outbound.md) |
| Env | none |
| Peer models | none |
| Events | none |
| Contracts | none |

## Add it

```bash
npx adonia add chat
npx adonia add chat --with-validators
```

`add chat` also installs `outbound`.

## What you get

| Path | Role |
|------|------|
| `message.ts` | `buildChatMessage`, `isChatWebhookUrl`, `isChatProvider`, `escapeSlack`, `escapeDiscord` |
| `send.ts` | `sendChatMessage`, `ChatDeliveryError` |
| `module.json` | Manifest |

| Flag | Destination |
|------|-------------|
| `--with-validators` / `--with-stubs` | `app/validators/rules/chat_webhook_url.ts` (Vine rule) |

## sendChatMessage

```ts
import { sendChatMessage } from '#modules/chat/send'

await sendChatMessage('slack', destination.url, {
  title: `New order on ${shop.name}`,
  fields: order.answers,
  link: { url: `${appUrl}/orders/${order.id}`, label: 'View order' },
})
```

| Step | What it does |
|------|--------------|
| URL check | The URL must be one the provider issues (`hooks.slack.com/services/…`, `discord.com/api/webhooks/…`). Else `ChatDeliveryError` with `status: null`, before any request |
| Escape | Title, field names and values. Slack: `&`, `<`, `>`. Discord: markdown, masked links, and `@` (a zero-width space stops `@everyone`). Discord messages also send `allowed_mentions: { parse: [] }` |
| Limits | At most 20 fields (the rest are counted), 300 characters per value, 3,000 (Slack) or 2,000 (Discord) per message |
| Send | Through `sendOutboundRequest`: no private addresses, no redirects, 10 s timeout |
| Result | A non-2xx answer throws `ChatDeliveryError` with the status |

`link.url` is not escaped. Build it from your own app URL, not from
user input.

`buildChatMessage(provider, input, limits?)` returns the JSON body
alone, if you send it another way.

## chatWebhookUrlRule

Checks the URL when the user saves the destination. It reads the
provider from a sibling field (`provider` by default) and reports
`E_VALIDATION_ERROR_CHAT_WEBHOOK_URL`.

```ts
import { chatWebhookUrlRule } from '#validators/rules/chat_webhook_url'

vine.object({
  provider: vine.enum(['webhook', 'slack', 'discord']),
  url: vine.string().url().use(chatWebhookUrlRule()),
})
```
