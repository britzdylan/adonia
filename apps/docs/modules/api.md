# api

`api` is the shared HTTP and domain base every other module sits on.
It gives you a JSON envelope, `ApiService`, `ctx.respond`, and a
global exception handler. `npx adonia init` installs it together with
`types`, `constants`, and `contracts`.

This page covers those four core packages: what they copy, how
controllers build responses, and how errors become one envelope.

## Add it

Run `init` on an AdonisJS app. You don't add `api` by itself unless
you're recovering a host that skipped core:

```bash
npx adonia init --wire
# or, if core is missing later:
npx adonia add api
```

`add api` always expands to `types`, `constants`, and `contracts`.
`init --wire` also registers the provider, error handler, import
aliases, and an empty `config/modules.ts`. See
[host wiring](../guide/host-wiring.md).

`api` has no stubs, npm dependencies, env keys, or domain events.

## What you get

The domain slice lands under `modules/api/`:

| File | Role |
|------|------|
| `service.ts` | `ApiService` base class |
| `envelope.ts` | Runtime helpers (`prepareError`, type guards) |
| `exception.ts` | `ApiException` carrier |
| `exception_handler.ts` | Global JSON exception handler |
| `provider.ts` | Registers `ctx.respond` and `ctx.serialize` |
| `module.json` | Manifest |

Core packages copy next to it:

| Package | Import | Contents |
|---------|--------|----------|
| `types` | `#modules/types` | Envelope types, `ModuleActionConfig`, `IUserModel` |
| `constants` | `#constants` | `exceptions`, `responseCodes`, `defineCodes` |
| `contracts` | `#modules/contracts` | Shared `User` and `UserStore` |

Host wiring must provide these import aliases (or `init --wire` does):

- `#modules/*` → `./modules/*.js`
- `#modules/types` → `./modules/types/index.js`
- `#modules/contracts` → `./modules/contracts/index.js`
- `#constants` / `#constants/*` → `./modules/constants/`
- `#adapters/*` → `./app/adapters/*.js`

## Response envelope

Controllers and hosts build envelopes. Domain services under
`modules/` return DTOs and throw `ApiException` instead of wrapping
results.

A success body looks like this:

```json
{
  "success": true,
  "message": "M_AUTH_LOGIN",
  "data": { "id": 1, "email": "ada@example.com" }
}
```

`message` is a string or `null`. We recommend the codes in
`#constants/responseCodes` (`M_AUTH_LOGIN`, `M_PROFILE_UPDATED`, and
the rest) so clients can switch on a stable token.

A paginated success body adds required `meta`:

```json
{
  "success": true,
  "message": null,
  "data": [],
  "meta": {
    "total": 40,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  }
}
```

A failure body looks like this:

```json
{
  "success": false,
  "message": "E_INVALID_TOKEN",
  "status": 400
}
```

Vine validation failures keep the same envelope and add an `errors`
array of field messages. The exception handler takes the first field
message as `message`.

## ApiService

`ApiService` is the base class for feature domain services. It
exposes envelope helpers for controllers and `emitSafe` for domain
events.

```ts
import ApiService from '#modules/api/service'

export class AuthService extends ApiService {
  namespace = 'auth'
}
```

`namespace` selects `config/modules.ts` under `modules.<namespace>`.
If `namespace` is `null` (the default on the base class),
`resolveConfig()` returns `null` and `emitSafe` logs a warning and
returns.

### Envelope helpers

Call these from controllers and hosts, not from domain services:

- `prepareResponse(data, message?)` — success envelope
- `preparePaginatedResponse(data, total, params?)` — success plus
  `meta` (`page` defaults to `1`, `pageSize` defaults to
  `data.length`)
- `prepareError(message, status?)` — failure envelope (also
  exported from `#modules/api/envelope`)

### emitSafe

`emitSafe(eventName, payload)` emits a typed Adonis event when:

1. `config/modules.ts` has an entry for `this.namespace`.
2. That entry's `emits` array includes `eventName`.

Listener errors are caught and logged. They don't fail the use case.
Import the module's `events.ts` file so the `EventsList`
augmentation loads.

<!-- prettier-ignore -->
> [!NOTE]
> `add` merges each feature module's `events` list into
> `config/modules.ts`. Remove a name from `emits` when you want to
> silence that event without changing the service.

## ctx.respond

The API provider boots `HttpContext.respond` and `HttpContext.serialize`.
`respond` takes an envelope, serializes `data` through Adonis
transformers without double-wrapping, and returns the shared JSON
shape. On `success: false` it sets the HTTP status from
`result.status` (default `400`).

```ts
return ctx.response.ok(
  await ctx.respond({
    success: true,
    message: responseCodes.AUTH_LOGIN.code,
    data: { user, token: sessionResult.token ?? null },
  })
)
```

Register the provider in `adonisrc.ts`:

```ts
() => import('#modules/api/provider'),
```

## Exception handler

`#modules/api/exception_handler` formats every JSON error through
`prepareError`. Adonis package errors, `ApiException`, and unknown
failures share one shape. `debug` is forced off so clients get a
stable envelope in every environment.

Status codes `400`, `401`, `403`, `404`, and `422` are ignored in
`report` so expected client errors stay quiet.

Point the HTTP server at it in `start/kernel.ts`:

```ts
server.errorHandler(() => import('#modules/api/exception_handler'))
```

`init --wire` also writes `app/exceptions/handler.ts` as a re-export
of that module.

Throw domain errors with `ApiException`:

```ts
import ApiException from '#modules/api/exception'
import { exceptions } from '#constants/exceptions'

throw ApiException.from(exceptions.INVALID_TOKEN)
```

## Exception catalog

`#constants/exceptions` is the shared code table. Feature services
throw some of these; others are documented for host middleware
(auth guards, rate limiters, upload limits). Hosts extend the table
with `defineCodes` in `app/constants/`.

| Key | HTTP | Code | Thrown by |
|-----|------|------|-----------|
| `INVALID_CREDENTIALS` | 401 | `E_INVALID_CREDENTIALS` | Host auth |
| `UNAUTHENTICATED` | 401 | `E_UNAUTHENTICATED` | Host auth |
| `SESSION_EXPIRED` | 401 | `E_SESSION_EXPIRED` | Host auth |
| `ACCOUNT_UNVERIFIED` | 403 | `E_ACCOUNT_UNVERIFIED` | `auth` |
| `FORBIDDEN` | 403 | `E_FORBIDDEN` | Host authorization |
| `SAME_EMAIL` | 400 | `E_SAME_EMAIL` | `account` |
| `INVALID_PASSWORD` | 400 | `E_INVALID_PASSWORD` | `account` |
| `INVALID_TOKEN` | 400 | `E_INVALID_TOKEN` | `auth`, `account` |
| `PAYLOAD_TOO_LARGE` | 413 | `E_PAYLOAD_TOO_LARGE` | Host uploads |
| `EMAIL_EXISTS` | 409 | `E_EMAIL_EXISTS` | `account` |
| `TOO_MANY_ATTEMPTS` | 429 | `E_TOO_MANY_ATTEMPTS` | Host limiter |
| `TOO_MANY_REQUESTS` | 429 | `E_TOO_MANY_REQUESTS` | Host limiter |

The exception handler puts `error.code` (or `error.message`) in
`message`. Clients therefore see `E_INVALID_TOKEN`, not a localized
sentence, unless you throw with an explicit `message` option.

## Shared UserStore

`#modules/contracts` exports `User`, `RegisterUserInput`,
`AuthMethod`, and `UserStore`. `auth` and `account` depend on this
port. The Lucid adapter is an `auth` stub, not part of `api`.

`UserStore` must:

- Persist new email users without setting `emailVerifiedAt` or the
  verification token (the auth service owns that flow).
- Hash passwords on create and `updatePassword`.
- Map persistence models to the portable `User` DTO on the way out.

## Next steps

Wire a host, then add a feature module:

1. Confirm [host wiring](../guide/host-wiring.md) registered the
   provider and exception handler.
2. Add [`auth`](./auth.md) for accounts, or
   [`notification`](./notification.md) if you only need dispatch.
3. Read [`module.json`](../reference/module-json.md) when you author
   your own slice.
