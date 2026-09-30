# adonia

Adonia is a CLI that scaffolds a registry of AdonisJS modules for rapid API development.

Adonia is a registry of AdonisJS modules and a CLI that copies them
into an existing app. `adonia add auth` copies the auth service, its
contracts, and a manifest into `modules/auth`. Those files are
ordinary source in the host. `diff` compares them with the registry,
and `add --overwrite` puts the registry copy back. A plain `add`
copies only that domain slice. Models, migrations, controllers,
adapters, and routes are separate flags, because they have to match
the app they land in.

**Requirements:** Node.js 20+, an AdonisJS app (`adonisrc.ts` and
`@adonisjs/core`).

```bash
npx adonia@latest init --wire
npx adonia@latest add auth
```

## Quick start

From an AdonisJS API app:

```bash
npx adonia init --wire
npx adonia add auth
npx adonia add auth --with-adapters
npx adonia add auth --with-routes --wire-routes
npx adonia check
```

Plain `add` copies the domain slice under `modules/` only. Models,
migrations, controllers, validators, adapters, and routes are
opt-in.

Full kit in one step:

```bash
npx adonia init --scaffold
```

That wires the host and copies every feature module with stubs and
routes.

## Commands

| Command | Role |
|---------|------|
| `init` | Write `adonia.json` and copy the API core |
| `init --wire` | Also set import aliases, `ctx.respond`, and the JSON exception handler |
| `init --scaffold` | Core + all feature modules with stubs and routes (implies `--wire`) |
| `add <name…>` | Copy one or more modules (and optional stubs) |
| `list` | Registry names and install status |
| `diff <name>` | Compare host files to the registry |
| `check` | Validate the host install |

`check` fails after a plain `add auth` until `#models/user` and
`#models/password_reset` exist. Pass `--with-models` / `--with-stubs`,
or add those files yourself.

## Bundled modules

| Name | Role |
|------|------|
| `api` | Shared envelopes, `ApiService`, `ctx.respond`, exception handler |
| `types`, `constants`, `contracts` | Core types and the shared `UserStore` port (installed with `api`) |
| `auth` | Registration, login, verification, password reset |
| `account` | Profile, email change, password change, deletion |
| `notification` | Multi-channel dispatcher with a host-owned registry |
| `creem` | Creem checkout, portal, invoices, webhooks |
| `subscription` | Subscription state synced from Creem webhooks |

`add` walks `registryDependencies`. For example,
`adonia add subscription` installs `creem` and core first when they
are missing.

## `add` flags

| Flag | Copies |
|------|--------|
| `--with-models` | `stubs/models/` → `app/models/` |
| `--with-migrations` | `stubs/migrations/` → `database/migrations/` |
| `--with-controllers` | Controllers (implies adapters) |
| `--with-validators` | Validators and the Vine provider |
| `--with-adapters` | Lucid/SDK adapters → `app/adapters/` |
| `--with-stubs` | Models, migrations, controllers, validators, adapters, Vine provider, limiter stub. **Not** routes |
| `--with-routes` | `start/routes/<name>.ts` and `start/limiter.ts` |
| `--wire-routes` | Import that route file from `start/routes.ts` |
| `--with-tests` | Colocated tests under `modules/<name>/tests/` |

`--with-stubs` does not copy routes. Combine with `--with-routes`.

Adonis kits used by stubs (`@adonisjs/mail`, `@adonisjs/drive`,
`@adonisjs/limiter`) are not installed for you. `add` and `check`
print `node ace add @adonisjs/<pkg>` when a copied stub needs a
missing kit.

## Shared flags

| Flag | Effect |
|------|--------|
| `--cwd <dir>` | Host app directory |
| `-y`, `--yes` | Hide “continuing” log lines (does not prompt) |
| `--dry-run` | Print the plan; write nothing |
| `--registry <dir>` | Local registry path |
| `--overwrite` | Replace host files whose contents differ |

## Documentation

- [Getting started](https://github.com/britzdylan/adonia/blob/main/apps/docs/guide/getting-started.md)
- [CLI](https://github.com/britzdylan/adonia/blob/main/apps/docs/cli/overview.md)
- [Modules](https://github.com/britzdylan/adonia/blob/main/apps/docs/modules/overview.md)
- [Source](https://github.com/britzdylan/adonia)

## License

MIT
