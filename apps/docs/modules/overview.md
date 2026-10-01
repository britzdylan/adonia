# Modules overview

Each module is source in the host after `add`. You edit it there.

| Name | Kind | Role |
|------|------|------|
| `api` | Core | Shared envelopes, `ApiService`, `ctx.respond`, exception handler |
| `types` | Core | Envelope and model TypeScript types |
| `constants` | Core | Exception codes and controller success codes |
| `contracts` | Core | Shared `User` / `UserStore` port |
| `auth` | Feature | Registration, login, verification, password reset |
| `account` | Feature | Profile, email change, password change, deletion |
| `notification` | Feature | Multi-channel dispatcher with a host-owned registry |
| `creem` | Feature | Creem checkout, portal, invoices, webhooks |
| `subscription` | Feature | Subscription state synced from Creem webhooks |

`init` copies **core**. Feature modules are separate `add`s.
`add` walks `registryDependencies` and copies missing packages
first. Core packages `types`, `constants`, and `contracts` don't
have their own pages. They're documented with [`api`](./api.md),
because `add api` pulls them in automatically.

<!-- prettier-ignore -->
> [!NOTE]
> [`adonia list`](../cli/list.md) prints every name in the resolved
> registry and marks which ones are already in `adonia.json`
> `installed`.

## How add copies a module

Plain `adonia add <name>` copies the **domain slice** only: the
service, contracts, events, options, and `module.json` under
`modules/<name>/`. Host files stay out of the way until you ask for
them.

Opt-in flags copy **stubs** into the host tree. The flags stack:

- `--with-adapters` copies Lucid/SDK adapters to `app/adapters/`.
- `--with-controllers` copies controllers and implies adapters.
- `--with-validators` copies Vine validators and `providers/`.
- `--with-models` / `--with-migrations` copy Lucid models and
  migrations.
- `--with-routes` copies `start/routes/<name>.ts` and the limiter
  example under `start/`. Pass `--wire-routes` to import that file
  from `start/routes.ts`.
- `--with-stubs` copies models, migrations, controllers, validators,
  providers, start files, and adapters. It does **not** copy routes.
  Pass `--with-routes` as well when you want the example router file.

`--with-tests` copies the module's unit tests under
`modules/<name>/tests/`. Host integration specs listed in
`hostTests` stay in the registry as a reference; they are not copied
by this flag.

<!-- prettier-ignore -->
> [!IMPORTANT]
> Adonis packages used by stubs (`@adonisjs/mail`, `@adonisjs/drive`,
> `@adonisjs/limiter`) are not stubbed with no-ops. `add` and `check`
> warn when a copied stub needs a package that is missing from
> `package.json` and print `node ace add @adonisjs/<pkg>`.

See the [`add` command](../cli/add.md) for the full flag list.

## Dependency graph

Feature modules never copy in isolation when a dependency is missing.
`add` expands `registryDependencies` and prints a plan such as
`api → types → constants → contracts → auth`.

```text
api (+ types, constants, contracts)
 ├── auth
 │    └── account
 ├── notification
 └── creem
      └── subscription
```

Install in that order, or pass the leaf name and let the CLI pull
parents. For example, `adonia add account` also installs `api` (and
core) and `auth` if they aren't already in `adonia.json`.

## Domain services versus host HTTP

Domain services return DTOs or `void` and throw `ApiException`. They
don't wrap HTTP envelopes. Controllers in the host, or the optional
stubs, call `ApiService.prepareResponse` / `preparePaginatedResponse`
and `ctx.respond`. The full authoring contract is the
[module interface](../guide/module-interface.md).

Services that extend `ApiService` emit events through `emitSafe`. An
event fires only when its name is listed in `config/modules.ts` under
that module's `emits` array. `add` merges those names when the module
declares `events` in `module.json`.

`NotificationService` is infrastructure, not a domain service. It
doesn't extend `ApiService` and it doesn't emit domain events.

## Shared user port

`auth` and `account` talk to a shared `UserStore` in
`#modules/contracts`. Persistence, password hashing, and schema
details stay in the host adapter. The Lucid adapter stub lives with
`auth`; `account` reuses `#adapters/lucid_user_store`.

You must implement `UserStore` yourself if you skip `--with-adapters`.

## Next steps

Pick a module and add it to a wired host:

1. Finish [getting started](../guide/getting-started.md) and
   [host wiring](../guide/host-wiring.md) if you haven't run
   `npx adonia init --wire`.
2. Read [`api`](./api.md) so you know the envelope and exception
   shape every other module uses.
3. Read the [module interface](../guide/module-interface.md) if
   you are writing a new slice.
4. Add a feature module, starting with [`auth`](./auth.md) or
   [`notification`](./notification.md).
