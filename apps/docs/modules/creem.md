# creem

`creem` is checkout sessions, customer portal links, product-to-plan
resolution, recent invoices, and webhook verification.

| Field | Value |
|-------|-------|
| Depends on | `api` |
| npm | `creem_io@^1.0.0` |
| Env | `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_TEST_MODE`, `CREEM_SUCCESS_URL` |
| Events | `Creem:CheckoutCreated`, `Creem:PortalLinkCreated` |
| Contracts | `CreemClient`, host-owned `CreemConfig` |

The service does not import `creem_io` or read env. Subscription
state lives in [`subscription`](./subscription.md). See
[concepts](../guide/concepts.md).

## Add it

`creem` depends on [`api`](./api.md). `add` installs npm dependency
`creem_io@^1.0.0` when it isn't already in the host
`package.json`.

```bash
npx adonia add creem
npx adonia add creem --with-adapters
```

There are no models, migrations, controllers, or routes. You build
checkout HTTP in the host.

`add` checks for these env names and prints a hint when they're
missing. It does not write values:

- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `CREEM_TEST_MODE`
- `CREEM_SUCCESS_URL`

## What you get

Plain `add` copies the domain slice to `modules/creem/`:

| Path | Role |
|------|------|
| `service.ts` | `CreemService` |
| `events.ts` | `EventsList` augmentation |
| `contracts/` | `CreemClient`, config, invoice types |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-adapters` / `--with-stubs` | `app/adapters/creem.ts`, `creem_io_client.ts` |
| `--with-tests` | `modules/creem/tests/` |

There are no peer models.

## CreemService

Construct with a `CreemClient` and `CreemConfig`. The adapter stub is
`createCreemService(options)` from `#adapters/creem`.

```ts
import { createCreemService } from '#adapters/creem'
import env from '#start/env'

const creem = createCreemService({
  apiKey: env.get('CREEM_API_KEY'),
  webhookSecret: env.get('CREEM_WEBHOOK_SECRET'),
  testMode: env.get('CREEM_TEST_MODE'),
  successUrl: env.get('CREEM_SUCCESS_URL'),
  defaultPlan: 'free',
  productPlans: {
    prod_starter_monthly: 'starter',
    prod_pro_monthly: 'pro',
  },
})
```

`CreemConfig` is host-owned:

| Field | Purpose |
|-------|---------|
| `successUrl` | Passed through to checkout |
| `productPlans` | Creem product id → plan name |
| `defaultPlan` | Fallback plan; also used by `SubscriptionService` |

Plan names are free-form strings. The module doesn't validate them.

### createCheckout

Creates a checkout session for `productId`, `userId`, and
`userEmail`. The client must put `userId` in Creem metadata so
webhook handlers can link the customer later.

Returns the checkout URL string. If the client returns no URL, the
service throws `Error('Creem did not return a checkout URL')` (not
an `ApiException`). On success it emits `Creem:CheckoutCreated`.

### createPortalLink

Creates a customer portal URL for a Creem customer id, emits
`Creem:PortalLinkCreated`, and returns the URL.

### resolveProductPlan

Maps a Creem product id through `config.productPlans`. Unmapped ids
return `config.defaultPlan`. `defaultPlan` is also exposed as
`creem.defaultPlan` for [`subscription`](./subscription.md).

### getLastInvoices

Lists the latest transactions for a customer (limit 3) and returns
items whose `type` is `'invoice'`.

### handleWebhookEvents

Delegates to `CreemClient.handleWebhookEvents` with the raw body,
signature, and handler map. Signature verification belongs in the
client, not the service.

`SubscriptionService.syncFromWebhook` is the usual caller. Use
`handleWebhookEvents` directly only when you need custom handlers
without subscription upserts.

## Contracts you must implement

Skip `--with-adapters` only when you provide a `CreemClient`
yourself. The bundled stub wraps `creem_io`.

### CreemClient

Narrow port over the Creem payment SDK. Keep checkout metadata
compatible with subscription webhook snapshots.

| Method | Role |
|--------|------|
| `createCheckout({ successUrl, productId, customerEmail, userId })` | Returns `{ checkoutUrl }` |
| `createPortalLink(customerId)` | Returns `{ portalUrl }` |
| `listTransactions(customerId, limit)` | Returns `{ items: CreemInvoice[] }` |
| `handleWebhookEvents(rawBody, signature, handlers)` | Verifies and dispatches |

The `creem_io` stub (`CreemIoClient`) sets checkout metadata to
`{ userId: String(userId) }`. Keep that field if you write your own
client; subscription snapshots require `metadata.userId`.

### CreemWebhookHandlers

A string-keyed map of optional callbacks. Typed loosely so this
contract doesn't import `creem_io`. The subscription service passes
`onGrantAccess`, `onRevokeAccess`, `onSubscriptionCanceled`,
`onSubscriptionScheduledCancel`, `onSubscriptionUpdate`, and
`onRefundCreated`.

## Events

Import `#modules/creem/events`. Events fire only when listed under
`modules.creem.emits`.

| Event | Payload |
|-------|---------|
| `Creem:CheckoutCreated` | `{ userId, productId, checkoutUrl }` |
| `Creem:PortalLinkCreated` | `{ customerId }` |

Checkout **completion** is a webhook, not this event. Listen to
subscription events for entitlement changes.

## Next steps

Persist subscription state from the same webhooks:

1. Put `CREEM_*` values in `.env` and `start/env.ts`.
2. Expose host routes that call `createCheckout` and
   `createPortalLink`.
3. Add [`subscription`](./subscription.md) and point your Creem
   webhook URL at `syncFromWebhook`.
