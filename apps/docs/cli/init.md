# init

`init` prepares an AdonisJS app to receive Adonia modules. It writes
`adonia.json` when that file is missing, copies the shared API core
into `modules/`, and optionally wires import aliases, the API
provider, and the exception handler.

This page covers the Adonis-app check, `--wire`, `--skip-core`, and
`--scaffold`.

## Run it

From the host app directory:

```bash
npx adonia init
npx adonia init --wire
npx adonia init --scaffold
```

`init` exits 1 when the directory is not an Adonis app:

- `adonisrc.ts` is missing
- `package.json` is missing
- `package.json` does not depend on `@adonisjs/core`

## What it writes

When `adonia.json` is absent, `init` writes a default config:
`registry: "bundled"`, `ref` set to the CLI package version, default
paths (`modules/`, `app/models`, and the rest), default aliases, and
an empty `installed` array. When the file already exists, `init`
keeps it and prints that it did.

Without `--skip-core`, it then copies `api`, `types`, `constants`,
and `contracts` the same way [`add`](./add.md) does. Feature modules
are not copied unless you pass `--scaffold`.

`--dry-run` prints `Would write adonia.json` / `would-copy` and
leaves the host unchanged.

## Wire the host

`--wire` applies host wiring. `--scaffold` turns `--wire` on when
you omit it, and prints that it did.

Wiring does the following when the host is missing those pieces:

1. Merge these keys into `package.json` `"imports"` (existing keys
   are left alone):
   `#modules/*`, `#modules/types`, `#modules/contracts`,
   `#constants`, `#constants/*`, `#adapters/*`.
2. Append `() => import('#modules/api/provider')` to `adonisrc.ts`
   `providers`.
3. Set
   `server.errorHandler(() => import('#modules/api/exception_handler'))`
   in `start/kernel.ts` (creates the file if needed, and adds a
   `server` import when that file has neither).
4. Write `app/exceptions/handler.ts` as a re-export of the API
   exception handler when the file is missing or still looks like
   the Adonis default.
5. Create `config/modules.ts` with an empty record when that file
   is missing.

Without `--wire`, `init` prints the same checklist and does not
edit those files. See [host wiring](../guide/host-wiring.md) for
the host-side picture.

<!-- prettier-ignore -->
> [!NOTE]
> `--wire` never overwrites a custom `package.json` import that
> already uses the same key with a different path. Fill missing
> keys only.

## Skip core

`--skip-core` writes (or keeps) `adonia.json` and runs wiring when
you asked for it, but does not copy `api` or the other core
packages. Use this when you are iterating on host wiring against a
tree that already has `modules/`.

## Scaffold

`--scaffold` is the full-kit path:

1. Enable `--wire` if you didn't pass it.
2. Install core unless `--skip-core`.
3. `add` every feature module in the registry with `--with-stubs`,
   `--with-routes`, and `--wire-routes`.

The bundled registry's feature list is `auth`, `account`,
`notification`, `creem`, and `subscription`. Tests are not copied
(`--with-tests` stays off).

If those feature modules are already in `adonia.json` `installed`
and you omit `--overwrite`, scaffold prints that they are already
installed and returns without recopying stubs or wiring routes.
Pass `--overwrite` to recopy.

<!-- prettier-ignore -->
> [!IMPORTANT]
> Scaffold copies Lucid models, adapters, and example routes into
> the host. Adonis packages those stubs import (`@adonisjs/mail`,
> `@adonisjs/drive`, `@adonisjs/limiter`) are not installed for
> you. `add` prints `node ace add @adonisjs/<pkg>` when a copied
> stub needs a missing package.

## Flags

`init` accepts the [shared flags](../reference/cli-flags.md#shared-flags)
plus:

| Flag | Effect |
|------|--------|
| `--wire` | Apply aliases, provider, exception handler, `config/modules.ts` |
| `--skip-core` | Do not copy `api` + core packages |
| `--scaffold` | Install every feature module with stubs and routes (implies `--wire`) |

Without `--yes` and without `--dry-run`, `init` prints
`Install shared API core into ./modules? (yes)` and continues. It
does not wait for an answer.

## Next steps

Add a feature module, or inspect what landed:

1. Run [`add`](./add.md) for a slice such as `auth`.
2. Confirm names with [`list`](./list.md).
3. Read the [modules overview](../modules/overview.md) for what
   each slice contains.
