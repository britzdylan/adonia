# Getting started

This guide walks you from an empty AdonisJS API to a wired Adonia
host with the `auth` domain slice copied in. You need Node.js 20 or
later.

The steps use the published CLI (`npx adonia@latest`). For
authoring the registry itself, see
[local development](./local-development.md).

## Create an AdonisJS app

Adonia refuses to run unless the directory is an Adonis app:
`adonisrc.ts`, `package.json`, and a dependency on
`@adonisjs/core`.

Create an API kit, then enter it:

```bash
npm create adonisjs@latest my-api -- --kit=api
cd my-api
```

Use any AdonisJS 7 app that meets the check above. The API kit is
the usual match for these modules.

## Init and wire

From the app root, write `adonia.json`, copy the `api` core
(`types`, `constants`, `contracts`), and apply host wiring:

```bash
npx adonia@latest init --wire
```

Wiring adds import aliases, the API provider (`ctx.respond`), the
JSON exception handler, and an empty `config/modules.ts`. Details
are on [host wiring](./host-wiring.md).

Confirm the registry and core names:

```bash
npx adonia list
```

You must see `api`, `types`, `constants`, and `contracts` as
`installed`, and feature names as `available`.

## Add a feature module

Copy the `auth` domain slice (service, contracts, events). This
does **not** copy Lucid models or routes:

```bash
npx adonia add auth
```

`add` also installs core if it weren't already there, merges
`Auth:*` events into `config/modules.ts`, and records `auth` in
`adonia.json` `installed`.

Optional host files, in the combinations you actually want:

```bash
npx adonia add auth --with-adapters
npx adonia add auth --with-models --with-migrations
npx adonia add auth --with-stubs
npx adonia add auth --with-routes --wire-routes
```

`--with-stubs` copies models, migrations, controllers, validators,
adapters, the Vine provider, and the limiter example. It does
**not** copy routes. Add `--with-routes` for `start/routes/auth.ts`.

<!-- prettier-ignore -->
> [!IMPORTANT]
> [`check`](../cli/check.md) fails after plain `add auth` because
> auth lists peer models `#models/user` and `#models/password_reset`.
> Copy them with `--with-models` / `--with-stubs`, or add those
> files yourself, before you expect `check` to pass.

If you copied models and migrations, apply them:

```bash
node ace migration:run
```

Stubs that import `@adonisjs/limiter` print
`node ace add @adonisjs/limiter` when that package is missing. Run the
printed command; Adonia does not install those packages for you.

## Validate

`check` reports missing module folders, peer models, and wiring.
Run it from the app root after `add`:

```bash
npx adonia check
```

Fix errors (missing folders, missing peer models, missing
`registryDependencies` in `installed`). Warnings about empty `paths`
directories or missing packages stay exit 0 unless you pass `--strict`.

## Next steps

Go incremental, or take the full kit:

1. Read [concepts](./concepts.md) so domain, stubs, and events stay
   distinct.
2. Add more slices from the [modules overview](../modules/overview.md).
3. Use [`init --scaffold`](./scaffolding.md) only when you want every
   feature module plus stubs and routes in one step.
