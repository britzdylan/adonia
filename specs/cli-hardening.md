# Adonia CLI hardening and scaffold flags

Mode: feature
Project: Adonia

Close correctness gaps in `packages/modules`, then invert stub defaults
and add opt-in host scaffolding (models, migrations, controllers,
validators, routes) plus an `init --scaffold` full kit.

## Goals

1. `init --wire` never leaves `start/kernel.ts` calling `server`
   without importing it.
2. `add` / `init` only append a name to `adonia.json` `installed`
   when that module's plan had no conflicts.
3. `github:` registry values fail loudly — never silently fall back
   to bundled.
4. `check` validates registry dependency closure and `configKeys`
   (peer models already checked).
5. `add <name>` copies **module files + host register edits only** by
   default (no models, migrations, controllers, validators, routes).
6. Host stubs and routes are opt-in via flags; `init --scaffold`
   installs all feature modules with stubs + routes wired.

## Non-goals

- Implementing GitHub registry materialization (fail closed only).
- Interactive prompts for `--yes`.
- Using `hostTests` / `hostFacingExceptions` in this change.
- Renaming `adonis-api-stater` or stripping 501 fixture controllers.
- A web registry or changing published module service APIs.

## Surfaces

| Area | Files |
|------|--------|
| Wire / routes wire | `packages/modules/src/wire.ts` (or new `routes_wire.ts`) |
| Install bookkeeping | `packages/modules/src/commands/add.ts` |
| Init scaffold | `packages/modules/src/commands/init.ts` |
| Registry resolve | `packages/modules/src/registry/index.ts` |
| Plans | `packages/modules/src/registry/plan.ts` |
| Check | `packages/modules/src/commands/check.ts` |
| CLI flags | `packages/modules/src/cli.ts`, `types.ts` |
| Manifests / stubs | `apps/adonis-api-stater/modules/*/module.json`, new `stubs/routes/` |
| Tests / docs | `packages/modules/tests/cli.test.ts`, READMEs, CHANGELOG |

---

## Part A — Correctness (from prior audit)

### A1. Kernel `server` import on `--wire`

**Bug:** `ensureErrorHandler` appends `server.errorHandler(...)` then
tests `content.includes('server.')`, so a missing import is never
added.

**Fix:** Decide `needsServerImport` from the **pre-append** file text.
Append the handler line; if needed, prepend
`import server from '@adonisjs/core/services/server'`. Creating a new
kernel file already includes the import — leave that path unchanged.

**Test:** `fakeAdonis` kernel with only `router` import; `init --wire`;
assert `server` import + `errorHandler` present.

### A2. Do not mark installed on conflicts

**Bug:** Conflicts still append the module to `installed` while
`add` exits `1`.

**Rules:** Per module, update `installed` only if that module's
`executePlan` produced zero conflicts. Continue other names in the
same invocation. Dry-run never writes config. Remove the dead
`else if (overwrite && !installed)` branch. Conflict footer must say
the name was **not** recorded in `installed`.

**Test:** Dirty differing stub/model path with flags that copy stubs →
exit 1, `!installed.includes('auth')`.

### A3. Reject unimplemented `github:` registries

**Decision:** Do not implement materialization. When
`adonia.json` `registry` starts with `github:` and there is no
`--registry` flag, fail with a clear unsupported message. No bundled
fallback. Delete or stop calling `fetchGithubRegistry`.

**Test:** Host config with `github:…` → `list`/`add` non-zero; message
mentions not supported.

### A4. Stronger `check`

For each `installed` name:

1. **registryDependencies** — missing dep in `installed` → **error**.
   If `api` is installed, also require `CORE_PACKAGES`
   (`types`, `constants`, `contracts`, `adapters`).
2. **configKeys** — missing `config/modules.ts` key → **warning**
   (`--strict` fails).
3. **peerModels** — keep as **errors** (unchanged).

Do not implement `hostTests` / `hostFacingExceptions` here.

**Test:** `installed: ["auth"]` only → `check` exits 1 requiring
`api` (or listed dep).

---

## Part B — Scaffold flags (product feedback)

### B1. Invert `add` stub default

**Today:** stubs copy by default; `--skip-stubs` opts out.

**After:**

| Command | Default |
|---------|---------|
| `add auth` | Manifest `files` only under `modules/<name>/`, plus registry deps expansion, `adonia.json` updates, `config/modules.ts` / constants merges, env hints, npm deps. **No** app models, migrations, controllers, validators, routes. |
| `init` / `init --wire` | Unchanged: config + core only. No feature stubs. |

**Remove** `--skip-stubs` (breaking). Document in CHANGELOG.

Plain `add` next-steps footer must list how to pull stubs/routes:

```text
Models/migrations/controllers/validators/routes were not copied.
  adonia add auth --with-stubs
  adonia add auth --with-routes --wire-routes
```

### B2. `add` opt-in flags

```text
adonia add auth
adonia add auth --with-models
adonia add auth --with-migrations
adonia add auth --with-controllers
adonia add auth --with-validators
adonia add auth --with-stubs          # all four of the above
adonia add auth --with-routes         # write route file only
adonia add auth --with-routes --wire-routes
```

| Flag | Copies |
|------|--------|
| `--with-models` | `stubs/models/**` → `paths.models` |
| `--with-migrations` | `stubs/migrations/**` → `paths.migrations` |
| `--with-controllers` | `stubs/controllers/**` → `paths.controllers` |
| `--with-validators` | `stubs/validators/**` → `paths.validators` |
| `--with-stubs` | all four above |
| `--with-routes` | `stubs/routes/**` → host routes path (see B3) |
| `--wire-routes` | patch `start/routes.ts` to import/mount (requires routes on disk or `--with-routes`) |

`--wire-routes` without `--with-routes` and without an existing destination route file → error (or hard warning + exit 1).

`--with-stubs` does not imply routes. Routes stay separate.

**Implementation:** extend `planStubs` (or split planners) to filter by stub folder / kind from flags. `diff` should diff module files always; stub/route plans only when the corresponding `--with-*` was passed.

### B3. Per-module route stubs

Add registry artifacts, for example:

- `modules/auth/stubs/routes/auth.ts`
- `modules/account/stubs/routes/account.ts`

List them in each module's `module.json` `stubs`. Prefer extending stubs with a `stubs/routes/` folder so existing stub planning stays one pipeline; `--with-routes` selects only that folder.

Copy destination: `start/routes/<name>.ts` by default.

`--wire-routes` behavior:

- Idempotent: if `start/routes.ts` already imports the module route file, no-op.
- Append a single side-effect import, for example `import './routes/auth.js'`.
- Do not rewrite the entire routes file.
- Route stubs target the module's own controller stubs; document that `--with-controllers` is required for a runnable route file.

### B4. `init --scaffold`

```text
adonia init --wire --scaffold
```

Meaning:

1. Run normal init (write `adonia.json` if needed; install core unless `--skip-core`).
2. Imply `--wire` if `--scaffold` is set and `--wire` was omitted (log that wiring was implied).
3. Resolve registry; for every name in `registry.json` `modules` (feature modules only), run the equivalent of:

   `add <name> --with-stubs --with-routes --wire-routes --yes`

Respect `--dry-run` / `--overwrite` / `--registry` as shared flags.

`--scaffold` + `--skip-core` is allowed but unusual; still add feature modules (they will pull `api` via `registryDependencies` unless already present).

Scaffold installs all registry feature modules, not a hand-picked subset.

### B5. `check` under new defaults

Missing peer models after plain `add` remain errors — hosts must supply models or re-run with `--with-models` / `--with-stubs`. Update CLI tests that currently expect stubs on bare `add`.

Optional warning for missing route files: skip in this spec (follow-up).

### B6. Breaking change and docs

- CHANGELOG: `add` no longer copies stubs by default; use `--with-stubs` / granular flags; `--skip-stubs` removed.
- Root + package README command tables updated.
- Fixture `modules/README.md` host-hooks section updated.

## Implementation order

1. A1 wire kernel import.
2. A2 installed-on-conflict gate.
3. A3 fail closed on `github:`.
4. A4 stronger check.
5. B1–B2 invert defaults + granular `--with-*` / `--with-stubs`.
6. B3 route stubs + `--with-routes` / `--wire-routes`.
7. B4 `init --scaffold`.
8. Docs + CHANGELOG.

Each step keeps `npm test -w adonia` green.

## Out of scope follow-ups

- Real GitHub/HTTPS registry materialization + `ref` pinning.
- `hostTests` / `hostFacingExceptions` enforcement.
- `paths.routes` in `adonia.json`.
- Interactive confirmations.
- Migrating legacy `modules.json` on write.
