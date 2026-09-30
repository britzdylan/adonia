# What is Adonia

Adonia is a CLI and a registry of AdonisJS modules. The registry holds
the modules an API is built from: auth, account, notification, Creem
billing, and subscription, plus a shared API core. The CLI copies those
modules into an AdonisJS app you already have.

A plain `add` copies the domain slice: the service, its contracts, and
a manifest under `modules/<name>/`. `diff` compares those files with
the registry, and `add --overwrite` puts the registry version back.
Models, migrations, controllers, adapters, and routes are separate
flags, because they have to match the app they land in.

`init --scaffold` copies every feature module, with stubs and routes,
in one command. The rest of this page covers what a copy includes and
what stays in the host.

## Try it

Create an AdonisJS API app, then copy the auth module into it:

```bash
npm create adonisjs@latest my-api -- --kit=api
cd my-api
npx adonia@latest init --wire
npx adonia@latest add auth
```

`init --wire` writes `adonia.json`, copies the shared API core, and
wires the host. Peer models, `check`, and the rest of the flags are in
[getting started](./getting-started.md).

To copy every module in the registry, with stubs and routes, run this
instead of `init --wire` and `add`:

```bash
npx adonia@latest init --scaffold
```

## Source in the host

Each module is source in the host, not a runtime package you import
from `node_modules`. After `add`, edit the files in place.
[`diff`](../cli/diff.md) compares them to the registry;
[`add --overwrite`](../cli/add.md) replaces them with the registry
version.

The published npm package is `adonia`. It contains the CLI and a
**bundled registry**. The host depends on AdonisJS as usual, then
copies Adonia modules on top.

## An existing app

Adonia runs in an AdonisJS app that already has `adonisrc.ts` and
`@adonisjs/core`.

[`init`](../cli/init.md) writes [`adonia.json`](../reference/adonia-json.md)
and copies the shared [`api`](../modules/api.md) core. Feature
modules (`auth`, `account`, `notification`, `creem`,
`subscription`) are separate `add`s. Host models, adapters, and
example routes are opt-in flags, so a domain-only install does not
drop Lucid models into `app/`.

`init --scaffold` wires the host and copies every feature module with
stubs and routes. You still start from your AdonisJS app.

## What stays in the host

Domain services talk to **contracts** (for example `UserStore`).
Persistence, HTTP, Vine, Drive, Mail, and the Creem SDK stay in
host adapters and optional stubs. You can implement those ports
yourself, or copy the Lucid/`creem_io` stubs with `--with-adapters`.

Controllers build the JSON envelope. Services return portable data
objects or `void` and throw `ApiException`. That split is the main
idea behind every feature module. See [concepts](./concepts.md).

## Who it's for

Adonia fits when you already have, or will create, an AdonisJS API
and you want registration, accounts, notifications, or Creem billing
as modules you edit under `modules/`.

## Next steps

1. Read [concepts](./concepts.md) for domain versus stubs.
2. Skim the [modules overview](../modules/overview.md) for the
   catalog.
3. Follow [getting started](./getting-started.md) for peer models
   and `check`.
