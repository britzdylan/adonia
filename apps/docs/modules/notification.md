# notification

`notification` is a channel-agnostic dispatcher. You supply a
registry of types; the service fans out to email and in-app
transports. It also has an optional preference gate for email and
the in-app inbox.

| Field | Value |
|-------|-------|
| Depends on | `api` |
| Env | none |
| Peer models | `#models/app_notification` |
| Events | none |
| Contracts | host-owned registry, `MailTransport`, `AppNotificationStore`, `InboxStore`, `NotificationPreferenceStore` |

It does not own templates, preference names, or type names.
`NotificationService` does not extend `ApiService`. See
[module interface](../guide/module-interface.md).

## Add it

`notification` depends on [`api`](./api.md) only.

```bash
npx adonia add notification
npx adonia add notification --with-adapters
npx adonia add notification --with-models --with-migrations
npx adonia add notification --with-stubs
```

There are no controllers or routes. The account stub controller's
inbox routes call `InboxService` through `#adapters/notification`.

`--with-adapters` copies `AdonisMailTransport`, which needs
`@adonisjs/mail`. `add` prints `node ace add @adonisjs/mail` when
that package is missing.

The module declares no env keys, config keys, or events.

## What you get

Plain `add` copies the domain slice to `modules/notification/`:

| Path | Role |
|------|------|
| `service.ts` | `NotificationService` |
| `preferences.ts` | `PreferenceAwareNotificationService` |
| `inbox.ts` | `InboxService` |
| `delivery.ts` | `sendTracked`, `createTrackedMessenger`, `DELIVERY_REF_HEADER` |
| `recipient.ts` | `toMailRecipient`, `formatMailAddress` |
| `options.ts` | `onWarn` / `onError` callbacks |
| `contracts/` | Registry types, `MailTransport`, `AppNotificationStore`, `InboxStore`, `NotificationPreferenceStore`, `MailDeliveryTracker` |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-models` / `--with-stubs` | `app/models/app_notification.ts` |
| `--with-migrations` / `--with-stubs` | `database/migrations/` notifications table |
| `--with-adapters` / `--with-stubs` | `app/adapters/notification.ts`, mail transport, Lucid store, Lucid preference store |
| `--with-routes` / `--with-stubs` | `start/mail_delivery.ts` (tracked mail messenger) |
| `--with-tests` | `modules/notification/tests/` |

Peer model: `#models/app_notification`. The Lucid model uses table
`notifications`, a UUID primary key, and optional `readAt`.

## NotificationService

Construct with a registry, a `MailTransport`, an
`AppNotificationStore`, and optional callbacks. The adapter stub is
`createNotificationService(registry)` from `#adapters/notification`.

```ts
import { createNotificationService } from '#adapters/notification'
import type { NotificationRegistry } from '#modules/notification/contracts/index'

const registry = {
  verify_email: {
    email: (payload) => ({
      to: payload.email,
      subject: 'Verify your email',
      // host-owned mail message
    }),
  },
  welcome: {
    app: (payload) => ({
      userId: payload.userId,
      type: 'welcome',
      title: 'Welcome',
      body: 'Your account is ready.',
    }),
  },
} satisfies NotificationRegistry

const notifications = createNotificationService(registry)
```

`onWarn` runs when a requested channel has no handler for that type
(default: no-op). `onError` runs when a handler throws (default:
no-op).

### send

`send` fans the payload out to the channels you pass. Duplicate
channel names are ignored.

```ts
const status = await notifications.send(
  'verify_email',
  ['email', 'app'],
  { email: user.email, userId: user.id }
)
```

`send` dispatches the unique channel list in parallel. Each channel
is `'sent'`, `'skipped'`, or `'failed'`. A missing handler is
`'skipped'` (and `onWarn`). A thrown handler is `'failed'` (and
`onError`) and does not fail the other channel.

The return map always includes both channels:

```ts
{ email: 'sent', app: 'skipped' }
```

Email calls `mail.sendLater(definition.email(payload))`. In-app
calls `appNotifications.create(definition.app(payload))`.

## Email preferences

`PreferenceAwareNotificationService` wraps the dispatcher. It sends a
governed email only when the user has its preference on. You map each
type to a preference name, or to `null` for "always send" (account and
security mail). Types you leave out are always sent.

```ts
import { createPreferenceAwareNotificationService } from '#adapters/notification'

const notifications = createPreferenceAwareNotificationService(registry, {
  verify_email: null,
  weekly_digest: 'emailWeeklyDigest',
})

await notifications.send('weekly_digest', ['email', 'app'], { userId: user.id, email: user.email })
```

A governed email is opt-in. The email channel is dropped when:

- the payload has no numeric `userId` (`onWarn`)
- the user does not exist or has the preference off
- the preference lookup throws (`onError`)

The other channels are sent as asked. If no channel is left, the
result is `{ email: 'skipped', app: 'skipped' }`.

The Lucid stub `LucidNotificationPreferenceStore` reads a boolean
attribute of `#models/user`, for example `emailWeeklyDigest` on the
auth User stub. It reads only the names in your map.

## Inbox

`InboxService` is the user's in-app inbox. It extends `ApiService`
(namespace `notification`) and emits no events.

| Method | Returns |
|--------|---------|
| `getInbox(userId)` | `{ notifications, unreadCount }`: unread, newest first, at most `pageSize` (default 50) |
| `markRead(userId, id)` | The notification. Throws `E_NOTIFICATION_NOT_FOUND` (404) when the user has no notification with that id |
| `markAllRead(userId)` | How many were marked |

Every store method takes the `userId`, so one user cannot read or
mark another user's notification. Build it with `createInboxService()`
from `#adapters/notification`.

## Delivery tracking

Record whether a queued email reached the mail server on your own
record (for example "was the order email sent?"). The mail class puts
a reference in a header, and the messenger reports to your
`MailDeliveryTracker`:

```ts
import { DELIVERY_REF_HEADER } from '#modules/notification/delivery'

export default class OrderEmail extends BaseMail {
  prepare() {
    this.message.header(DELIVERY_REF_HEADER, `order:${this.order.id}`)
  }
}
```

`--with-stubs` / `--with-routes` copies `start/mail_delivery.ts`. It
calls `mail.setMessenger(...)` with `createTrackedMessenger`, so
`mail.sendLater` sends in the background with 3 attempts and calls
`tracker.sent(ref, at)` or, once after the last attempt,
`tracker.failed(ref, error)`. Preload it in `adonisrc.ts` and replace
its logging tracker with one that writes your records.

| Export | Does |
|--------|------|
| `sendTracked(send, ref, tracker, options)` | Retries `send` (default 3 attempts, 1 s / 4 s backoff), then records the result. Throws the last error |
| `createTrackedMessenger(mailer, tracker, options)` | A messenger for `mail.setMessenger` |
| `deliveryRefFromHeaders(headers)` | The reference, or `null` |

A tracker error goes to `onError` and never sends the email again.
The stub messenger keeps mail in memory. With a job queue
(`@adonisjs/queue`), call `sendTracked` from the job instead.

## Mail recipients

Module events carry the user DTO, not a Lucid model. Build mail from it:

```ts
import { formatMailAddress, toMailRecipient } from '#modules/notification/recipient'

emitter.on('Account:Closed', async (closed) => {
  const to = formatMailAddress(toMailRecipient(closed)) // "Ada Lovelace" <ada@example.com>
  await mail.sendLater((m) => m.to(to).subject('Your account is closed'))
})
```

`toMailRecipient` joins `firstName` and `lastName` (or gives `name:
null`). `formatMailAddress` escapes quotes and removes line breaks in
the name, so a name cannot add mail headers.

## Contracts you must implement

Skip `--with-adapters` only when you provide mail and in-app
transports yourself. The registry of types is always host-owned.

### NotificationRegistry

Keys are free-form strings such as `verify_email` or `welcome`. Each
value is a `NotificationDefinition`:

```ts
type NotificationDefinition = {
  email?: (payload: Record<string, unknown>) => unknown
  app?: (payload: Record<string, unknown>) => AppNotificationData
}
```

Omit a channel to skip it. The email function's return value is
opaque; the mail transport decides what a "message" is.

### MailTransport

Outbound email. The message type is opaque so this port stays
mailer-agnostic.

```ts
interface MailTransport {
  sendLater(message: unknown): Promise<void>
}
```

The Adonis stub forwards to `@adonisjs/mail`. Swap it for Resend,
SES, or a test double that records messages.

### AppNotificationStore

Persist in-app inbox rows. The Lucid stub inserts into the
`notifications` table.

```ts
interface AppNotificationStore {
  create(data: AppNotificationData): Promise<void>
}

type AppNotificationData = {
  userId: number
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}
```

### InboxStore

The read side of the same table. The Lucid stub
`LucidAppNotificationStore` implements both stores.

```ts
interface InboxStore {
  listUnread(userId: number, limit: number): Promise<InboxNotification[]>
  countUnread(userId: number): Promise<number>
  markRead(userId: number, id: string, readAt: Date): Promise<InboxNotification | null>
  markAllRead(userId: number, readAt: Date): Promise<number>
}
```

### MailDeliveryTracker

Only for delivery tracking.

```ts
interface MailDeliveryTracker {
  sent(ref: string, sentAt: Date): Promise<void>
  failed(ref: string, error: string): Promise<void>
}
```

### NotificationPreferenceStore

Only for `PreferenceAwareNotificationService`.

```ts
interface NotificationPreferenceStore {
  isEnabled(userId: number, preference: string): Promise<boolean>
}
```

Return `false` for an unknown user or preference.

## Wiring from other modules

Listen for domain events and call `send`. For example, after
`Auth:RegisterUser`:

```ts
import emitter from '@adonisjs/core/services/emitter'

emitter.on('Auth:RegisterUser', async (user) => {
  await notifications.send('verify_email', ['email'], {
    email: user.email,
    token: user.emailVerificationToken,
  })
})
```

The notification module doesn't subscribe for you. Keep listeners in
the host.

## Next steps

Use dispatch from auth and account events, then add billing if you
need it:

1. Run `node ace migration:run` if you copied the notifications
   table.
2. Register types for verification, password reset, and email
   change.
3. Add [`creem`](./creem.md) when you're ready for checkout.
