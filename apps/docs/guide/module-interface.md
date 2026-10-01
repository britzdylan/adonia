# Module interface

A module is a folder the CLI can copy. The **interface** is the
runtime contract that folder must speak so it composes with other
modules and with an AdonisJS 7 host.

The CLI will copy anything with a valid
[`module.json`](../reference/module-json.md). That is not enough.
Auth, account, and a third-party `invoices`
slice only work in the same app if they share `api`, ports, the
envelope, and events. This page is that shared surface.

Read [concepts](./concepts.md) for host versus registry. This page
is the authoring contract.

## Depend on the core

Every feature module lists `api` in `registryDependencies`. `add`
then copies `types`, `constants`, and `contracts` as well.

```text
your module → api → types, constants, contracts
```

Do not ship a second envelope, a second exception type, or a
second `User` DTO. Import:

| Import | What it is |
|--------|------------|
| `#modules/api/service` | `ApiService` (`namespace`, `emitSafe`) |
| `#modules/api/exception` | `ApiException` |
| `#modules/types` | Envelope types, `ModuleActionConfig` |
| `#constants/exceptions` | Status/code catalog |
| `#modules/contracts` | Shared `User` / `UserStore` |

The host must have the aliases from [host wiring](./host-wiring.md).
`--wire` writes them. Without those aliases the module does not
boot, even if the files landed.

## Domain, not HTTP

The domain slice is what plain `add` copies:

```text
modules/<name>/
  service.ts
  contracts/
  events.ts      # omit if you emit nothing
  options.ts     # omit if you have no tunables
  module.json
```

The service:

- Sets `namespace` to the `config/modules.ts` key (`auth`,
  `account`, …).
- Takes **ports and options** in the constructor. It does not read
  `process.env` or `HttpContext`.
- Returns portable objects or `void`.
- Throws `ApiException` (prefer `ApiException.from(exceptions.X)`).
- Does not build `{ success, message, data }`. Controllers do that
  and call `ctx.respond`.

`NotificationService` does not extend `ApiService` and declares
no events. It is a dispatcher, not a domain use-case. Use that
shape only for infrastructure of that kind, not for a feature
with a sequence of steps (register, checkout, cancel).

## Ports

A **port** is a TypeScript interface in `contracts/`. The service
depends on the interface. The host implements it in
`app/adapters/` (`#adapters/<name>`).

Rules:

- No Lucid, Drive, Mail, or `creem_io` types on the port.
- Map persistence models to DTOs inside the adapter.
- User-facing modules reuse `#modules/contracts` `User` and
  `UserStore`. Do not declare a second user shape.
- Module-specific ports live next to the service
  (`PasswordResetStore`, `CreemClient`, `MailTransport`).

If two modules both need "the current person," they share
`UserStore`. If they need a new table, they get a new port, not a
new copy of `User`.

Tests construct the service with in-memory fakes of the same
ports. That is how you know the interface is real.

## Failures

Throw `ApiException`. The wired exception handler turns it into
the shared failure envelope. Do not `return prepareError(...)`
from a domain method.

Use catalog keys in `#constants/exceptions` when the failure is
already named (`INVALID_TOKEN`, `ACCOUNT_UNVERIFIED`). The thrown
code is the entry's `code` (`E_INVALID_TOKEN`). Add a key in
`constants/` (and merge carefully) when you introduce a new code.
Do not invent ad-hoc string codes in the service.

`hostFacingExceptions` in `module.json` documents codes for host
middleware (guards, limiters). `check` does not enforce that list
yet. Feature services may throw a different set.

## Events

If the service extends `ApiService` and has side effects the host
might listen to:

1. Augment `EventsList` in `events.ts`. Import that file from the
   service so the augmentation loads.
2. Name events `Namespace:Verb` (`Auth:Login`,
   `Subscription:Activated`).
3. List the same strings in `module.json` `events`. `add` merges
   them into `config/modules.ts` `emits`.
4. Call `this.emitSafe(name, payload)` only. If the name is not in
   `emits`, the call is a no-op. If `modules.<namespace>` is
   missing, `emitSafe` logs and returns.

The CLI does not register `emitter.on` listeners. The host does.
List `modules.<namespace>` in `configKeys` so `check` can warn
when that leaf is missing.

## HTTP stays in stubs

Routes, controllers, Vine validators, Lucid models, and migrations
are **stubs**. They are optional. They must not be in `files`.

Controllers:

- Validate with Vine.
- Call the service.
- Wrap the result with `ctx.respond` and a
  `#constants/responseCodes` token.

Adapters in `stubs/adapters/` implement the ports with Lucid or an
SDK. Factories such as `createAuthService()` belong there, imported
as `#adapters/<name>`.

## Manifest

`module.json` is how the CLI sees the module. Required in practice:

| Field | You put |
|-------|---------|
| `name` | Same as the folder |
| `files` | Domain globs (`service.ts`, `contracts/**`, `module.json`, …) |
| `registryDependencies` | At least `api` |
| `stubs` | Optional host globs under `stubs/<folder>/` |
| `events` / `configKeys` | If you `emitSafe` |
| `peerModels` | `#models/…` Lucid adapters need |
| `env` | Names the host must set (not written by `add`) |
| `dependencies` | npm packages the **domain or adapters** import |

Field semantics: [`module.json`](../reference/module-json.md).
If the registry ships `registry.json`, add the name to the
`modules` array so `list` prints it. `add <name>` still loads a
folder that has `module.json`.

## Checklist

A new module is ready when:

1. Folder name equals `module.json` `name`.
2. `registryDependencies` includes `api`.
3. The service uses ports + `ApiException` + `emitSafe` (or is an
   explicit non-`ApiService` dispatcher).
4. No `HttpContext` or Lucid in `service.ts`.
5. User identity goes through `UserStore` when the slice is about
   a person.
6. Colocated tests construct fakes of the ports.
7. Stubs, if any, sit under `stubs/` and are listed in `stubs`.
8. `registry.json` lists the name.

Author in `apps/adonis-api-stater/modules/`, then
[local development](./local-development.md) (`--registry`,
`sync-registry`).

## Next steps

1. [`module.json`](../reference/module-json.md) — field catalog.
2. [`api`](../modules/api.md) — envelope, `ctx.respond`, handler.
3. [`auth`](../modules/auth.md) — a full feature slice to copy.
