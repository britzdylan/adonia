# Modules package (authoring fixture)

This directory is the **authoring source** for Adonia modules. It lives
inside a fixture Adonis app used to design and test slices. Hosts do
**not** copy from here — they run:

```bash
npx adonia@latest init --wire
npx adonia@latest add auth
npx adonia@latest add auth --with-stubs
npx adonia@latest add auth --with-routes --wire-routes
# or full kit:
npx adonia@latest init --scaffold
```

Local authors iterating on a module can point the CLI at this tree:

```bash
npx adonia add auth --registry .
# or from the monorepo root:
node packages/modules/build/cli.js add auth \
  --registry apps/adonis-api-stater/modules
```

`npm run sync-registry -w adonia` copies this tree into
`packages/modules/registry/` for the npm tarball.

## Layout

| Path | Role |
|------|------|
| `types/`, `constants/`, `contracts/`, `adapters/` | Shared core (always copy with `api`) |
| `api/` | Envelopes, `ApiService`, `ctx.respond`, exception handler |
| `auth/`, `account/`, `notification/`, `creem/`, `subscription/` | Feature modules |

Import path: `#modules/<name>/…` (for example `#modules/auth/service`).

Public names are listed in `registry.json`.

## `module.json` schema

Each feature module (and `api`) ships a manifest:

- **files** — domain slice copy set (relative to the module folder).
- **stubs** — host files under `stubs/` (`models`, `migrations`,
  `controllers`, `validators`, `providers`, `start`, `routes`). Opt-in
  via CLI `--with-*` flags; plain `add` does not copy them. `--with-validators`
  also copies `providers/`; `--with-routes` and `--with-stubs` also copy
  `start/` (limiter example).
- **dependencies** — npm packages this module imports.
- **registryDependencies** — other modules that must already be present.
- **peerModels** — `#models/*` aliases Lucid adapters expect.
- **configKeys** — keys under `config/modules.ts`.
- **env** — environment variables the host must provide.
- **events** — names to list in `config/modules.ts` `emits`.
- **hostFacingExceptions** — codes kept for middleware/hosts (see
  `constants/exceptions.ts`).
- **hostTests** — integration specs that stay in the host `tests/` tree.

## Install checklist (manual / without CLI)

Prefer `npx adonia`. If installing by hand:

1. Aliases: `#modules/*`, `#modules/types`, `#constants`, `#adapters/*`.
2. Copy `api` + `types` + `constants` + `contracts` (+ shared `adapters`
   when using Lucid).
3. Register `#modules/api/provider` and `#modules/api/exception_handler`.
4. Copy feature modules in `registryDependencies` order.
5. Optionally copy stubs (`--with-stubs` / `--with-routes`) into `app/`,
   `database/`, `providers/`, `start/`, and `start/routes/`. Register
   `providers/vine_provider.ts` in `adonisrc.ts`. `@adonisjs/limiter` is
   an optional peer for the limiter stub.
6. Fill `config/modules.ts` from each module's `events` list.
7. Optional: replace Lucid adapters with host adapters; delete `adapters/`
   after copy if unused.

## Authoring a new module

See [Adding a feature module](../../../docs/architecture/adding-modules.md)
for the service API, contracts, events, stubs, and `module.json`
checklist.
