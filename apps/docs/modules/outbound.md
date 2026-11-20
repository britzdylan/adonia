# outbound

`outbound` sends HTTP requests to URLs your users give you (webhooks,
callbacks, link previews) without letting them reach your private
network.

| Field | Value |
|-------|-------|
| Depends on | `api` |
| Env | none |
| Peer models | none |
| Events | none |
| Contracts | none |

A URL that points at the server, the private network, or a cloud
metadata endpoint (`169.254.169.254`) is refused. This is protection
against server-side request forgery (SSRF).

## Add it

```bash
npx adonia add outbound
npx adonia add outbound --with-validators
```

## What you get

Plain `add` copies the domain slice to `modules/outbound/`:

| Path | Role |
|------|------|
| `url_safety.ts` | `assertPublicUrl`, `isPrivateAddress`, `resolvePublicAddresses`, `publicOnlyLookup`, `UnsafeUrlError` |
| `request.ts` | `sendOutboundRequest`, `sendPinned` |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-validators` / `--with-stubs` | `app/validators/rules/public_url.ts` (Vine rule) |
| `--with-tests` | `modules/outbound/tests/` |

## sendOutboundRequest

```ts
import { sendOutboundRequest } from '#modules/outbound/request'

const { status } = await sendOutboundRequest(
  webhook.url,
  {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeoutMs: 10_000,
  },
  { allowPrivate: env.get('OUTBOUND_ALLOW_PRIVATE_URLS', false) }
)
```

| Step | What it does |
|------|--------------|
| Check | The URL must be http(s). Every address its host resolves to must be public. Else `UnsafeUrlError`. |
| Pin | The socket connects to the address that was checked (`publicOnlyLookup`). A DNS answer that changes between the check and the connection (DNS rebinding) cannot reach an internal address. |
| Send | `node:http` / `node:https`, no shared agent. Default method `POST`. |
| Redirects | Not followed. A 3xx is returned like any other status. |
| Timeout | Rejects with `Request did not respond within <n> ms`. |

It resolves with `{ status, statusText }` for every response,
including 4xx and 5xx. It rejects on network errors and timeouts.
The response body is drained, not returned.

`allowPrivate` turns the check off. Use it only for local
development and tests (for example a receiver on `localhost`).

## Blocked addresses

| Family | Ranges |
|--------|--------|
| IPv4 | `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `224.0.0.0/3` |
| IPv6 | `::`, `::1`, `fc00::/7`, `fe80::/10`, `ff00::/8`, and IPv4-mapped forms of the IPv4 ranges |

Other spellings of a blocked address (`http://2130706433/`,
`http://0x7f.0.0.1/`, `http://127.1/`) are normalized by the URL
parser and refused too.

## publicUrlRule

The Vine rule runs the same check when the user saves the URL, so
they see the problem then and not as a failed delivery later.

```ts
import vine from '@vinejs/vine'
import { publicUrlRule } from '#validators/rules/public_url'

export const webhookValidator = vine.create(
  vine.object({
    url: vine.string().url().use(publicUrlRule({ allowPrivate: false })),
  })
)
```

It reports `E_VALIDATION_ERROR_UNSAFE_URL`. The
[`api`](./api.md) exception handler puts that code in the envelope
`message`.

## Next steps

1. Validate every user-supplied URL with `publicUrlRule`.
2. Send every request to it with `sendOutboundRequest`, not `fetch`.
3. Keep `allowPrivate` off in production.
