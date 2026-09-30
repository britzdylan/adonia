# Concepts

Adonia splits **domain** (portable services and contracts) from
**host I/O** (Lucid, HTTP, Vine, Drive, Mail, payment SDKs). The
CLI copies domain by default and host files only when you pass
`--with-*` flags.

This page defines the terms the rest of the docs use: host,
registry, module, stub, adapter, envelope, and events.

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

## Domain slice versus stubs

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

Wire a host and pick an install style:

1. Finish [host wiring](./host-wiring.md) if `init` ran without
   `--wire`.
2. Choose incremental `add` or [scaffolding](./scaffolding.md).
3. Open a module page, starting with [`auth`](../modules/auth.md).
