# module.json

`module.json` is the per-module manifest in the registry. `add`,
`diff`, and `check` parse it with Zod (`moduleManifestSchema`).
Each feature folder (and `api`) ships one. Core packages `types`,
`constants`, and `contracts` have no file; the CLI synthesizes a
manifest.

## Where it lives

In the registry: `<registry>/<name>/module.json`. After `add`, the
same file is copied into the host at
`<paths.modules>/<name>/module.json`.

[`check`](../cli/check.md) errors when a copied `name` does not
match the folder. It loads dependency and peer data from the
**registry** manifest, not only from the host copy.

The registry may also have a root `registry.json`:

```json
{
  "core": ["api", "types", "constants", "contracts"],
  "modules": ["auth", "account", "notification", "creem", "subscription"]
}
```

If that file is missing, the CLI infers `core` as whichever of
`api` / `types` / `constants` / `contracts` exist as directories,
and `modules` as other directories that contain `module.json`.
[`list`](../cli/list.md) prints `core` then `modules` in that
order.

## Implied core manifests

For `types`, `constants`, and `contracts`, `loadManifest` builds:

- `description`: `Shared <name> package`
- `files`: `["**/*"]` (still ignoring `stubs/`, `tests/`,
  `node_modules/`)
- empty `stubs`, `dependencies`, `registryDependencies`, and the
  other arrays

`api` is core in `registry.json` but **does** have a real
`module.json` (`registryDependencies` on those three packages).

## Field catalog

Every key below is optional in Zod except `name` (min length 1).
Omitted arrays default to `[]`. Omitted `description` defaults to
`""`. Omitted `dependencies` defaults to `{}`.

| Field | Type | Role |
|-------|------|------|
| `name` | string | Folder identity; must match after copy |
| `description` | string | [`list`](../cli/list.md) text |
| `files` | string[] | Domain-slice globs (relative to the module folder) |
| `stubs` | string[] | Host-file globs under `stubs/` |
| `dependencies` | object | npm name → version spec to install |
| `registryDependencies` | string[] | Other modules `add` must copy first |
| `peerModels` | string[] | `#models/…` files the host must have |
| `configKeys` | string[] | Keys expected in `config/modules.ts` |
| `env` | string[] | Names `add` looks for (not written) |
| `events` | string[] | Names merged into `config/modules.ts` `emits` |
| `hostFacingExceptions` | string[] | Documented host codes (not checked) |
| `hostTests` | string[] | Documented host specs (not copied) |

Empty `files` means “all files” (`**/*`), still excluding
`stubs/**`, `tests/**`, and `node_modules/**`. Empty `stubs`
means no stub copies even when you pass `--with-*`.

## files and stubs

`files` are fast-glob patterns from the module root. They land
under `<paths.modules>/<name>/`. Typical domain set:

```json
"files": [
  "service.ts",
  "events.ts",
  "options.ts",
  "contracts/**",
  "module.json"
]
```

`stubs` patterns must stay under `stubs/<folder>/…`. The first
path segment after `stubs/` selects the destination:

| Folder | Destination |
|--------|-------------|
| `models` | `paths.models` |
| `migrations` | `paths.migrations` |
| `controllers` | `paths.controllers` |
| `validators` | `paths.validators` |
| `adapters` | `app/adapters/` |
| `providers` | `providers/` |
| `start` | `start/` |
| `routes` | `start/routes/` |

A stub with no folder (`stubs/readme.ts`) is skipped with a
warning. Unknown folder names are skipped with a warning.
CLI flags that select those folders are on
[`add`](../cli/add.md) and [CLI flags](./cli-flags.md#stub-flags).

## dependencies and registryDependencies

`dependencies` is npm packages this module imports. `add` installs
missing ones with the host package manager (`pnpm` / `yarn` /
`npm`). The bundled registry only uses this for `creem`
(`creem_io`: `^1.0.0`).

`registryDependencies` is other **module names**. `add` expands
the graph and prints `Plan: …`. Cycles throw. `api` also pulls
`types`, `constants`, and `contracts` even when you `add api`
directly.

[`check`](../cli/check.md) errors when an installed module lists
a dependency that is not in `adonia.json` `installed`.

Bundled graph:

```text
api → types, constants, contracts
auth → api
account → api, auth
notification → api
creem → api
subscription → api, creem
```

## peerModels

Each entry is an import alias. `check` strips `#models/` and
resolves `<paths.models>/<rest>.ts`. Example: `#models/user` →
`app/models/user.ts`.

Plain `add auth` does not copy models, so `check` fails until
`--with-models` / `--with-stubs` (or your own files) provide
`#models/user` and `#models/password_reset`.

## configKeys, env, and events

`configKeys` entries such as `modules.auth` are checked as a
**leaf** in `config/modules.ts`: the segment after the last `.`
must appear as `auth:` (word boundary). Missing file or missing
leaf is a warning.

`env` names are scanned in `.env`, `.env.example`, and
`start/env.ts`. `add` prints
`Missing env keys for <name> (not written): …`. It never writes
values. `APP_KEY` (auth, account) and the `CREEM_*` keys (creem)
are the bundled examples.

`events` are merged into `config/modules.ts` under that module's
`emits` array. `emitSafe` only fires names listed there. `check`
warns when a declared event string is absent from the file.
`api` and `notification` declare none.

## hostFacingExceptions and hostTests

These arrays are **reserved**. `check` does not validate them
(comment in the check command: not checked yet).

`hostFacingExceptions` names catalog keys in
`#constants/exceptions` that host middleware is expected to use
(auth guards, limiters, upload limits). Feature services may throw
a different set; see each [module page](../modules/overview.md).

`hostTests` points at integration specs that stay in a host
`tests/` tree. `--with-tests` copies **colocated**
`modules/<name>/tests/` from the registry. It does not copy
`hostTests` paths.

## Example (auth)

Trimmed from the bundled `auth` manifest:

```json
{
  "name": "auth",
  "description": "Email registration, login, verification, password reset",
  "files": [
    "service.ts",
    "events.ts",
    "options.ts",
    "contracts/**",
    "module.json"
  ],
  "stubs": [
    "stubs/models/user.ts",
    "stubs/migrations/*.ts",
    "stubs/adapters/**/*",
    "stubs/routes/auth.ts"
  ],
  "dependencies": {},
  "registryDependencies": ["api"],
  "peerModels": ["#models/user", "#models/password_reset"],
  "configKeys": ["modules.auth"],
  "env": ["APP_KEY"],
  "events": ["Auth:RegisterUser", "Auth:Login"],
  "hostFacingExceptions": ["INVALID_CREDENTIALS", "UNAUTHENTICATED"],
  "hostTests": ["tests/integration/lucid_adapters.spec.ts"]
}
```

Author a new folder the same way, then list it in `registry.json`.
The runtime contract (service, ports, envelope, events) is the
[module interface](../guide/module-interface.md). See
[local development](../guide/local-development.md).

See [`adonia.json`](./adonia-json.md), [`add`](../cli/add.md), and
[`auth`](../modules/auth.md).
