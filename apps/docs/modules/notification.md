# notification

`notification` is a channel-agnostic dispatcher. You supply a
registry of types; the service fans out to email and in-app
transports.

| Field | Value |
|-------|-------|
| Depends on | `api` |
| Env | none |
| Peer models | `#models/app_notification` |
| Events | none |
| Contracts | host-owned registry, `MailTransport`, `AppNotificationStore` |

It does not own templates, preferences, or type names.
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

There are no controllers or routes. Inbox HTTP in the account stub
controller reads `#models/app_notification` after you copy the
notification model.

`--with-adapters` copies `AdonisMailTransport`, which needs
`@adonisjs/mail`. `add` prints `node ace add @adonisjs/mail` when
that package is missing.

The module declares no env keys, config keys, or events.

## What you get

Plain `add` copies the domain slice to `modules/notification/`:

| Path | Role |
|------|------|
| `service.ts` | `NotificationService` |
| `options.ts` | `onWarn` / `onError` callbacks |
| `contracts/` | Registry types, `MailTransport`, `AppNotificationStore` |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-models` / `--with-stubs` | `app/models/app_notification.ts` |
| `--with-migrations` / `--with-stubs` | `database/migrations/` notifications table |
| `--with-adapters` / `--with-stubs` | `app/adapters/notification.ts`, mail transport, Lucid store |
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

Preference flags on `User` (marketing, product updates) are host
columns. This store does not read them.

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
