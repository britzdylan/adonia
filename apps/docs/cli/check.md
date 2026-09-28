# check

`check` validates a host that already has `adonia.json`. It reports
**errors** (exit 1) and **warnings** (exit 0 unless `--strict`). Use
it after `add` and in CI.

This page covers what is treated as an error versus a warning, and
how `--strict` changes the exit code.

## Run it

```bash
npx adonia check
npx adonia check --strict
```

Missing `adonia.json` (and missing legacy `modules.json`) prints the
init hint and exits 1.

## Errors

Any error sets exit code 1, even without `--strict`.

`check` walks `adonia.json` `installed` and fails when:

- The folder `paths.modules/<name>` is missing.
- Local `module.json` `name` does not match the folder name.
- A `registryDependencies` entry (and, for `api`, `types` /
  `constants` / `contracts`) is not in `installed`.
- A manifest `peerModels` alias has no file. `#models/user` must
  exist at `paths.models/user.ts` (default `app/models/user.ts`).

Plain `adonia add auth` does not copy models, so `check` fails on
`#models/user` and `#models/password_reset` until you add
`--with-models` / `--with-stubs` or provide those files yourself.

## Warnings

Warnings print as `warn: …`. Without `--strict`, `check` still
exits 0 and prints `check passed` or
`check passed (N warnings)`.

`check` warns when:

- A `paths.*` directory from `adonia.json` does not exist yet.
- Local `module.json` cannot be parsed.
- `config/modules.ts` is missing while the module declares `events`
  or `configKeys`.
- An event name from the manifest is absent from
  `config/modules.ts`.
- A `configKeys` leaf (the segment after the last `.`, for example
  `auth` from `modules.auth`) has no `key:` in that file.
- `package.json` `"imports"` is missing a required alias
  (`#modules/*`, `#constants`, `#adapters/*`, and the rest from
  [`init --wire`](./init.md#wire-the-host)).
- `adonisrc.ts` does not mention `#modules/api/provider`.
- `start/kernel.ts` does not mention
  `#modules/api/exception_handler`.
- An Adonis kit is missing while a stub that needs it is present
  (`@adonisjs/limiter` with `start/limiter.ts`, `@adonisjs/drive`
  with `app/adapters/drive_avatar_storage.ts`, `@adonisjs/mail`
  with `app/adapters/adonis_mail_transport.ts`). The text includes
  `node ace add @adonisjs/<pkg>`.
- The registry cannot load a listed module's manifest (the error
  message is printed as a warning).

`hostTests` and `hostFacingExceptions` in `module.json` are not
checked yet.

## Strict mode

`--strict` treats every warning as a failure: exit code 1, no
`check passed` line. Errors still print as `error:`.

Use `--strict` in CI once the host is fully wired and stub peers
exist. A freshly `init --wire`'d app with no feature modules still
warns (for example missing path directories), so `--strict` fails
there until those paths exist.

## Flags

`check` accepts the [shared flags](../reference/cli-flags.md#shared-flags)
plus:

| Flag | Effect |
|------|--------|
| `--strict` | Exit 1 when any warning was printed |

`--overwrite` and `--dry-run` do not change `check`: it never
writes files.

## Next steps

Fix what `check` reported, then move on:

1. Run [`init --wire`](./init.md#wire-the-host) for missing
   aliases, provider, or exception handler.
2. [`add`](./add.md) with `--with-models` (or `--with-stubs`) when
   peer models are missing.
3. Browse [modules](../modules/overview.md) for the slice you just
   installed.
