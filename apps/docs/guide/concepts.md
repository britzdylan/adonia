# Concepts

Read this after you have run `add` once. If you have not, start
with [what Adonia is](./what-is-adonia.md) and
[getting started](./getting-started.md). If you are writing a new
slice, the authoring contract is the
[module interface](./module-interface.md).

A plain `add` copies services and contracts under `modules/`. Lucid,
HTTP, Vine, Drive, Mail, and payment SDKs stay in the host unless
you pass `--with-*` flags. That split is the rest of this page.

## Host, registry, and module

The **host** is your AdonisJS app. It owns `adonisrc.ts`,
`start/`, `app/`, and `adonia.json`.

The **registry** is a tree of module folders. The published CLI
ships a **bundled** copy. `--registry <dir>` or a local path in
`adonia.json` points at another tree (the fixture in this
monorepo). `github:…` registries are not supported in
`adonia@0.1.x`.

A **module** is one folder in that registry with a
[`module.json`](../reference/module-json.md) (core packages
`types`, `constants`, and `contracts` use an implied manifest).
[`add`](../cli/add.md) copies it into `paths.modules` (default
`modules/<name>/`).

## Domain versus stubs

The **domain slice** is what plain `add` copies: `service.ts`,
`contracts/`, `events.ts`, `options.ts`, `module.json`. Feature
services return portable data objects (often called DTOs) or
`void`. They throw `ApiException`. They do not wrap HTTP JSON.

**Stubs** are example host files under `stubs/` in the registry:
models, migrations, controllers, validators, adapters, providers,
`start/` (limiter), and routes. Flags select which folders copy,
and where they land (`app/models`, `app/adapters`,
`start/routes`, and so on). See
[how add copies a module](../modules/overview.md#how-add-copies-a-module).

An **adapter** implements a contract with a concrete package (Lucid
user store, `creem_io` client, Adonis Mail). Factories such as
`createAuthService()` live in `app/adapters/` and import as
`#adapters/auth`.

You must implement the contracts yourself if you skip
`--with-adapters`. Tests in the registry use in-memory fakes for
the same ports.

## Envelope and ctx.respond

HTTP success and failure share one JSON shape: `success`,
`message`, and `data` (plus `meta` when paginated). Controllers
build that envelope. `ctx.respond` serializes `data` through
Adonis transformers without double-wrapping.

The API exception handler turns `ApiException` and framework
errors into the failure envelope. That handler is registered by
[host wiring](./host-wiring.md), not by copying `modules/api`
alone.

Details and examples: [`api`](../modules/api.md).

## Events and config/modules.ts

Services that extend `ApiService` call `emitSafe(eventName, payload)`.
The event fires only when `config/modules.ts` has a
`modules.<namespace>` entry whose `emits` array includes that
name. `add` merges the manifest `events` list into that file.

Import the module's `events.ts` so TypeScript's `EventsList`
augmentation loads. Listeners live in the host (`emitter.on`).
The CLI does not register listeners.

`NotificationService` does not extend `ApiService` and does not
emit domain events. You call `send` from your own listeners.

## Contracts and the shared user

`auth` and `account` persist users through `#modules/contracts`
`UserStore`. The portable `User` type is the object those
services pass around. Hashing, schema, and Lucid stay in the
adapter.

Other modules follow the same pattern: `PasswordResetStore`,
`AvatarStorage`, `MailTransport`, `CreemClient`,
`SubscriptionStore`. The host supplies implementations.

## Copy policy

Identical files are skipped. Differing files conflict unless you
pass `--overwrite`. A module is recorded in `installed` only when
every planned file for that add copies cleanly. Full rules:
[CLI overview](../cli/overview.md#copy-policy).

## Next steps

1. Open [`auth`](../modules/auth.md) or the
   [modules overview](../modules/overview.md).
2. [Host wiring](./host-wiring.md) if `init` ran without `--wire`.
3. [Scaffolding](./scaffolding.md) if you want every module at
   once.
4. [Module interface](./module-interface.md) when you author a
   new slice.
