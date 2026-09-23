# Changelog

## Unreleased

### Breaking

- `adonia add` no longer copies host stubs (`models`, `migrations`,
  `controllers`, `validators`) by default. Use `--with-stubs` or the
  granular `--with-models` / `--with-migrations` / `--with-controllers` /
  `--with-validators` flags.
- Removed `--skip-stubs` (no longer needed; stubs are opt-in).

### Added

- Opt-in scaffolding: `--with-stubs`, `--with-models`,
  `--with-migrations`, `--with-controllers`, `--with-validators`,
  `--with-routes`, `--wire-routes`.
- Route stubs under `stubs/routes/` for `auth` and `account`; copied to
  `start/routes/<name>.ts` and optionally mounted via `--wire-routes`.
- `adonia init --scaffold` installs every registry feature module with
  stubs + routes wired (implies `--wire`).
- CLI hardening: safe `server` import on `--wire`, do not mark
  `installed` on file conflicts, fail closed on `github:` registries,
  `check` enforces `registryDependencies` and warns on `configKeys`.
- Auth stubs: logout, password/validate, activate/request; Vine
  unique/exists/validToken/validPassword rules + provider; limiter
  example. `--with-validators` copies `providers/`; `--with-routes`
  and `--with-stubs` copy `start/limiter.ts`.

## 0.1.0

- Turborepo extract: `packages/modules` (adonia CLI) + `apps/adonis-api-stater` fixture.
