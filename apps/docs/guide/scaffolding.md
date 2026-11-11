# Scaffolding

`init --scaffold` copies every feature module, with stubs and
routes, into an AdonisJS app you already have.

Use incremental [`add`](../cli/add.md) when you only want one
slice. Use `--scaffold` when you want the whole catalog on a new
app.

```bash
npx adonia init --scaffold
```

## Incremental add versus scaffold

Incremental install is the path in
[getting started](./getting-started.md): `init --wire`, then `add`
one name at a time, with only the `--with-*` flags you want.

`--scaffold` does all of the following in one command:

1. Turn on `--wire` if you omitted it (and print that it did).
2. Copy `api`, `types`, `constants`, and `contracts` unless you
   pass `--skip-core`.
3. `add` every feature name in the registry index with
   `--with-stubs`, `--with-routes`, and `--wire-routes`.

The bundled feature list is `auth`, `account`, `notification`,
`creem`, and `subscription`. `--with-tests` stays off; module unit
tests are not copied.

Use incremental `add` when you only want billing, or only auth
domain without HTTP stubs. Use `--scaffold` when you want models,
adapters, example controllers, and mounted route files for the
whole catalog.

## What scaffold copies

Besides core under `modules/`, scaffold copies each feature's
stub set (where that module has files):

- Lucid models and migrations (`auth` users and password resets,
  `notification` inbox rows, `subscription` rows)
- Controllers and Vine validators for `auth` and `account`
- Adapters under `app/adapters/` (Lucid, Drive avatar, Mail,
  `creem_io`)
- `providers/vine_provider.ts` and `start/limiter.ts`
- `start/routes/auth.ts` and `start/routes/account.ts`, imported
  from `start/routes.ts`

Modules without route stubs (`notification`, `creem`,
`subscription`) still get their domain slice and adapters; they
do not get a `start/routes/<name>.ts` file.

Auth middleware and limiter `.use(…)` calls on those example
routes stay commented out until you enable them.

## Adonis packages

Scaffold does not run `node ace add` for you. Copied stubs import
these packages:

| Package | Typical stub |
|---------|----------------|
| `@adonisjs/limiter` | `start/limiter.ts` (auth and account routes) |
| `@adonisjs/drive` | `app/adapters/drive_avatar_storage.ts` |
| `@adonisjs/mail` | `app/adapters/adonis_mail_transport.ts` |

`add` (and therefore scaffold) prints `node ace add @adonisjs/<pkg>`
when the stub is present and the package is missing.
[`check`](../cli/check.md) warns the same way.

`creem` also installs npm dependency `creem_io` when it isn't in
the host `package.json`. Put `CREEM_*` values in env yourself;
the CLI only prints missing names.

## New starter-kit app

The AdonisJS API starter kit ships its own `app/models/user.ts` and
`1761885935168_create_users_table.ts` migration. The `auth` stubs
replace both, so a plain scaffold reports them as conflicts and
exits 1 without recording `auth` as installed.

On a new app, pass `--overwrite`:

```bash
npx adonia init --scaffold --overwrite
```

The kit's sample auth files target the kit's own `User` model and
stop compiling after that. Scaffold lists the ones it finds; remove
them and their routes in `start/routes.ts`:

- `app/controllers/new_account_controller.ts`
- `app/controllers/access_tokens_controller.ts`
- `app/controllers/profile_controller.ts`
- `app/validators/user.ts`
- `app/transformers/user_transformer.ts`

On an app with your own user model, skip `--overwrite` and merge
the two files by hand.

Migration stubs keep a fixed timestamp prefix, so `users` is
created before the tables that reference it.

## Already installed

If every feature module is already in `adonia.json` `installed`
and you omit `--overwrite`, scaffold prints that they are already
installed and **returns without recopying stubs or wiring routes**.
Pass `--overwrite` to recopy from the registry.

`--dry-run` prints the plan (`Would write`, `Would wire`,
`would-copy`) and changes nothing.

Command-level flags and edge cases: [`init`](../cli/init.md#scaffold).

## Next steps

After scaffold, finish host HTTP and packages:

1. Run `node ace add` for each printed Adonis package.
2. Run `node ace migration:run`.
3. Register `providers/vine_provider.ts` in `adonisrc.ts` if it
   isn't already.
4. Read [host wiring](./host-wiring.md) and the
   [modules overview](../modules/overview.md).
