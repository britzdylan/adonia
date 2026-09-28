# What is Adonia

Adonia is a library of AdonisJS modules you copy into an existing
app with a CLI. You add the slices you need. You don't replace your
app with a starter kit.

This page is the product picture: what Adonia copies, what it leaves
to you, and how that differs from generating a whole API from a
template.

## Modules you own

Each module is source in your host, not a runtime package you import
from `node_modules`. `npx adonia add auth` copies `AuthService`,
contracts, and a `module.json` into `modules/auth/`. After that, the
files are yours to edit. [`diff`](../cli/diff.md) compares them to
the registry; [`add --overwrite`](../cli/add.md) replaces them when
you want the registry version back.

The published npm package is `adonia`. It ships the CLI and a
**bundled registry**. Hosts do not depend on `@adonisjs/auth` being
rewritten; they depend on AdonisJS as usual, then copy Adonia
slices on top.

## Not a starter kit

A starter kit decides your folder layout, auth HTTP, and billing in
one generate step. Adonia assumes you already have an AdonisJS app
(`adonisrc.ts` and `@adonisjs/core`).

[`init`](../cli/init.md) writes [`adonia.json`](../reference/adonia-json.md)
and copies the shared [`api`](../modules/api.md) core. Feature
modules (`auth`, `account`, `notification`, `creem`,
`subscription`) are separate `add`s. Host models, adapters, and
example routes are opt-in flags, so a domain-only install does not
drop Lucid models into `app/`.

<!-- prettier-ignore -->
> [!NOTE]
> `init --scaffold` is the closest thing to a kit: it wires the
> host and copies every feature module with stubs and routes. You
> still start from your Adonis app, not from an Adonia template.

## What stays in the host

Domain services talk to **contracts** (for example `UserStore`).
Persistence, HTTP, Vine, Drive, Mail, and the Creem SDK stay in
host adapters and optional stubs. You can implement those ports
yourself, or copy the Lucid/`creem_io` stubs with `--with-adapters`.

Controllers build the JSON envelope. Services return portable data
objects or `void` and throw `ApiException`. That split is the main
idea behind every feature module. See [concepts](./concepts.md).

## Who it's for

Adonia fits when you already have (or will create) an AdonisJS API
and you want registration, accounts, notifications, or Creem
billing as copyable slices. It does not fit when you want a black
box npm module that upgrades in place without touching `modules/`.

## Next steps

Put Adonia on a host, then learn the moving parts:

1. Follow [getting started](./getting-started.md).
2. Read [concepts](./concepts.md) for domain versus stubs.
3. Skim the [modules overview](../modules/overview.md) for the
   catalog.
