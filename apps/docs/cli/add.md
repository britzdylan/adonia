# add

`add` copies one or more modules from the resolved registry into the
host. Plain `add` copies the domain slice under `modules/<name>/`.
Host models, adapters, controllers, and routes are opt-in flags.

This page covers the install plan, stub flags, copy conflicts, npm
and env side effects, and route wiring.

## Run it

`adonia.json` must already exist (`npx adonia init` first).

```bash
npx adonia add auth
npx adonia add auth account
npx adonia add subscription
npx adonia add auth --with-adapters
npx adonia add auth --with-stubs
npx adonia add auth --with-routes --wire-routes
```

With no names, `add` prints `Usage: adonia add <name…>` and exits 1.

## Install plan

`add` expands `registryDependencies` (and, for `api`, the core
packages `types`, `constants`, and `contracts`). Already-installed
names are skipped unless you pass `--overwrite`. The CLI prints the
order, for example `Plan: api → types → constants → contracts → auth`.

`adonia add subscription` therefore installs `creem` first when it
isn't already in `installed`.

A second `add auth` with `auth` already recorded is a no-op:
`Nothing to install (already in adonia.json installed). Use
--overwrite to recopy.` Local edits stay in place.

Without `--yes` and without `--dry-run`, `add` prints
`(continuing; pass --yes to silence)` and continues. It does not
wait for confirmation.

## What plain add copies

For each name in the plan, `add` copies the manifest `files` globs
into `adonia.json` `paths.modules` (default `modules/<name>/`).
`stubs/` and `tests/` are ignored unless you opt in.

After a successful copy it also:

- Merges new keys from the registry `exceptions.ts` and
  `responseCodes.ts` into the host `modules/constants/` catalogs
  (host keys are kept; differing values print a conflict warning).
- Merges `config/modules.ts` for feature modules that declare
  `events` (creates the file when it's missing).
- Prints missing env names listed in the manifest. Those values are
  **not** written. `add` looks in `.env`, `.env.example`, and
  `start/env.ts`.
- Installs npm packages from the manifest `dependencies` map when
  they are missing from the host `package.json`. The package manager
  is `pnpm` if `pnpm-lock.yaml` exists, `yarn` if `yarn.lock`
  exists, otherwise `npm`.

`creem` is the bundled module that currently declares an npm
dependency (`creem_io`).

A module lands in `installed` only when every planned file for that
module copies without a conflict. `--dry-run` never updates
`installed`.

## Stub flags

Pass one or more `--with-*` flags to copy host files. Destinations
follow `adonia.json` paths, plus fixed locations for routes,
providers, start files, and adapters.

| Flag | Copies |
|------|--------|
| `--with-models` | `stubs/models/` → `app/models/` |
| `--with-migrations` | `stubs/migrations/` → `database/migrations/` |
| `--with-controllers` | `stubs/controllers/` → `app/controllers/` (implies adapters) |
| `--with-validators` | `stubs/validators/` → `app/validators/`, plus `providers/` |
| `--with-adapters` | `stubs/adapters/` → `app/adapters/` |
| `--with-routes` | `stubs/routes/` → `start/routes/`, plus `start/` (limiter example) |
| `--with-stubs` | models, migrations, controllers, validators, providers, start files, and adapters. **Not** routes |
| `--with-tests` | `tests/` under `modules/<name>/tests/` (only for names in this plan) |
| `--wire-routes` | Append `import './routes/<name>.js'` to `start/routes.ts` |

`--with-stubs` does not copy routes. Combine it with `--with-routes`
when you want the example router file.

`--with-controllers` implies `--with-adapters`. `--with-validators`
also copies the Vine provider. `--with-stubs` implies controllers,
validators, adapters, and `start/` (limiter), but still not routes.

`--wire-routes` does not create `start/routes/<name>.ts`. Pass
`--with-routes` in the same command, or create the file first.
Without that file, `add` exits 1 with
`Cannot --wire-routes for "<name>": missing start/routes/<name>.ts`.

Wiring is idempotent: if `start/routes.ts` already imports
`./routes/<name>.js` or `#start/routes/<name>`, nothing is appended.

<!-- prettier-ignore -->
> [!IMPORTANT]
> Adonis packages used by stubs are not stubbed with no-ops. When a
> copied file needs `@adonisjs/limiter`, `@adonisjs/drive`, or
> `@adonisjs/mail` and that package is missing, `add` prints
> `node ace add @adonisjs/<pkg>`. The warning is tied to the stub
> that landed (`start/limiter.ts`, `drive_avatar_storage.ts`,
> `adonis_mail_transport.ts`).

See the [modules overview](../modules/overview.md#how-add-copies-a-module)
for how these flags map onto each slice.

## Conflicts

When a destination exists and its hash differs from the registry,
and you omit `--overwrite`, that file is a **conflict**. `add`
prints each path, sets exit code 1, and does **not** record the
module in `installed`.

`--overwrite` replaces differing files. Identical files stay
skipped either way.

`--dry-run` reports `would-copy` / `would-conflict` and writes
nothing, including `config/modules.ts` and npm installs.

## Next steps footer

After a live `add` (not `--dry-run`, and not the core copy inside
`init`), the CLI prints steps it did not run.

When you copied no app stubs and no routes, it reminds you of
`--with-stubs`, `--with-adapters`, and `--with-routes --wire-routes`.

When you did copy stubs, it tells you to:

1. Register `providers/vine_provider.ts` in `adonisrc.ts` if
   validators were copied.
2. Uncomment limiter `.use(…)` on sensitive routes after
   `@adonisjs/limiter` is installed, if `start/` was copied.
3. Run `node ace migration:run`.
4. Listen for module events as needed.

If routes were copied without `--wire-routes`, it prints the
`--wire-routes` command to mount `start/routes/<name>.ts`.

## Flags

`add` accepts the [shared flags](../reference/cli-flags.md#shared-flags)
and the [stub flags](../reference/cli-flags.md#stub-flags) above.
`--overwrite` on `add` is the same switch as the global flag.

## Next steps

Inspect and validate what you copied:

1. Run [`list`](./list.md) to confirm `installed`.
2. Run [`diff`](./diff.md) after you edit a copied file.
3. Run [`check`](./check.md) before you rely on the host.
