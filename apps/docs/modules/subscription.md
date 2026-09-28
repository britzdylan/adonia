# subscription

`subscription` keeps local subscription state in sync with Creem
webhooks. Every handler upserts, so processing is idempotent and
order-independent. Plan names and the default plan come from
[`creem`](./creem.md).

This page covers read APIs (`getUserPlan`, `isActive`), webhook
sync, the store contract, and the Lucid stubs. Checkout HTTP stays
in the host; this module does not ship controllers or routes.

## Add it

`subscription` depends on `api` and `creem`. `add` installs those
first when they're missing.

```bash
npx adonia add subscription
npx adonia add subscription --with-adapters
npx adonia add subscription --with-models --with-migrations
npx adonia add subscription --with-stubs
```

There are no env keys. Creem credentials stay on the `creem` module.
There are no controllers or routes.

## What you get

Plain `add` copies the domain slice to `modules/subscription/`:

| Path | Role |
|------|------|
| `service.ts` | `SubscriptionService` |
| `events.ts` | `EventsList` augmentation |
| `options.ts` | Default `activeStatuses` |
| `contracts/` | `Subscription`, snapshot, `SubscriptionStore` |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-models` / `--with-stubs` | `app/models/subscription.ts` |
| `--with-migrations` / `--with-stubs` | `database/migrations/` subscriptions table and uniqueness |
| `--with-adapters` / `--with-stubs` | `app/adapters/subscription.ts`, Lucid store |
| `--with-tests` | `modules/subscription/tests/` |

Peer model: `#models/subscription`.

## SubscriptionService

Construct with a `SubscriptionStore`, a `CreemService`, and optional
`SubscriptionConfig`. The adapter stub is
`createSubscriptionService(creem)` from `#adapters/subscription`.

```ts
import { createCreemService } from '#adapters/creem'
import { createSubscriptionService } from '#adapters/subscription'

const creem = createCreemService(/* … */)
const subscriptions = createSubscriptionService(creem)
```

`activeStatuses` defaults to `['active', 'trialing', 'scheduled_cancel']`.
Pass a different list when your Creem statuses don't match.

### getSubscription

Returns the user's current subscription row, or `null`. "Current"
means the store's `findCurrentByUserId` (Lucid: latest
`currentPeriodEnd`).

### getUserPlan

When the user has a subscription whose `status` is in
`activeStatuses`, returns `creem.resolveProductPlan(creemProductId)`.
Otherwise returns `creem.defaultPlan`.

### getCurrentPeriodStart

Returns `currentPeriodStart` from the current subscription. Without
a subscription, returns the start of the current UTC month.

### isActive

True when `findActiveByUserId` finds a row in `activeStatuses`.

### syncFromWebhook

Pass the raw webhook body and signature. The Creem client verifies
the signature, then every handler maps the payload to a
`SubscriptionSnapshot` and upserts.

| Handler | Event |
|---------|-------|
| `onGrantAccess` | `Subscription:Activated` |
| `onRevokeAccess` | `Subscription:Revoked` |
| `onSubscriptionCanceled` | `Subscription:Canceled` |
| `onSubscriptionScheduledCancel` | `Subscription:ScheduledCancel` |
| `onSubscriptionUpdate` | `Subscription:Updated` |
| `onRefundCreated` | `Subscription:RefundCreated` (no upsert) |

`onRefundCreated` emits `{ refundId }` only. It does not change
local subscription rows.

Snapshots require `metadata.userId` (set at checkout). If `userId`
is missing or not a number, the handler returns without writing.
Keep that metadata field in your `CreemClient.createCheckout`.

Point a host route at this method. Use the raw body (not parsed
JSON) so signature verification matches Creem.

## Contracts you must implement

Skip `--with-adapters` only when you provide a `SubscriptionStore`
yourself. The Lucid stub maps snapshots onto `#models/subscription`.

### SubscriptionStore

Host persistence for subscription rows. The store never sees
`creem_io` types; it only receives snapshots the service builds.

| Method | Role |
|--------|------|
| `findCurrentByUserId(userId)` | Latest subscription or `null` |
| `findActiveByUserId(userId, activeStatuses)` | Entitled row or `null` |
| `upsert(snapshot)` | Insert or update from a webhook snapshot |

The Lucid stub maps `SubscriptionSnapshot` onto the model
(`customerId` → `creemCustomerId`, `productId` → `creemProductId`,
`productName` → `plan`, and so on). Persistence details stay in the
adapter.

### SubscriptionSnapshot

Normalized webhook payload. The service builds this; the store never
sees `creem_io` types.

```ts
type SubscriptionSnapshot = {
  id: string
  userId: number
  customerId: string
  productId: string
  productName: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  canceledAt: Date | null
}
```

## Events

Import `#modules/subscription/events`. Events fire only when listed
under `modules.subscription.emits`.

| Event | Payload |
|-------|---------|
| `Subscription:Activated` | `{ userId }` |
| `Subscription:Revoked` | `{ userId }` |
| `Subscription:Canceled` | `{ userId }` |
| `Subscription:ScheduledCancel` | `{ userId }` |
| `Subscription:Updated` | `{ userId }` |
| `Subscription:RefundCreated` | `{ refundId }` |

Use these to grant or revoke host features. Don't re-parse the
webhook in every listener; read `getUserPlan` / `isActive` instead.

## Next steps

Finish host HTTP around checkout and the webhook:

1. Run `node ace migration:run` if you copied subscription tables.
2. Add a webhook route that passes `rawBody` and the signature
   header into `syncFromWebhook`.
3. Gate product features with `isActive` or `getUserPlan`.
4. Return to the [modules overview](./overview.md) or the
   [`add` command](../cli/add.md) when you add another slice.
