# CLI flags

Flags for `adonia`. Command pages say when to use each switch.

Shared flags live on the root program. Stub flags apply to
[`add`](../cli/add.md) and [`diff`](../cli/diff.md). `init` and
`check` have command-specific flags.

## Shared flags

Pass these before or after the command name.

| Flag | Default | Commands | Effect |
|------|---------|----------|--------|
| `--cwd <dir>` | current directory | all | Host app root |
| `-y`, `--yes` | `false` | all | Hide “continuing” / core-install log lines. Does not prompt |
| `--dry-run` | `false` | all | Print the plan; write nothing. `diff` and `check` never write anyway |
| `--registry <dir>` | from `adonia.json` | all | Local registry directory (wins over config) |
| `--overwrite` | `false` | all (`add` also declares it) | Replace host files whose hash differs |

`--yes` never reads stdin. The CLI does not wait for confirmation.

`--registry` must be a local directory. `github:…` values in
`adonia.json` fail closed. See
[registry resolution](../cli/overview.md#registry-resolution).

## init flags

These flags are on [`init`](../cli/init.md) only.

| Flag | Default | Effect |
|------|---------|--------|
| `--wire` | `false` | Apply import aliases, API provider, exception handler, `config/modules.ts` |
| `--skip-core` | `false` | Do not copy `api`, `types`, `constants`, or `contracts` |
| `--scaffold` | `false` | Install every feature module with stubs and routes. Implies `--wire` |

## Stub flags

These flags are on [`add`](../cli/add.md) and [`diff`](../cli/diff.md).
`add` copies the selected files. `diff` includes them in the
comparison. `--with-tests` and `--wire-routes` only affect `add`
(`diff` accepts them and ignores them).

| Flag | Effect on `add` |
|------|-----------------|
| `--with-models` | Copy `stubs/models/` → `app/models/` |
| `--with-migrations` | Copy `stubs/migrations/` → `database/migrations/` |
| `--with-controllers` | Copy controllers; implies adapters |
| `--with-validators` | Copy validators and `providers/` (Vine) |
| `--with-adapters` | Copy Lucid/SDK adapters → `app/adapters/` |
| `--with-stubs` | models, migrations, controllers, validators, adapters, Vine provider, limiter stub. **Not** routes |
| `--with-routes` | Copy `stubs/routes/` and `start/` (limiter example) |
| `--wire-routes` | Append `import './routes/<name>.js'` in `start/routes.ts` |
| `--with-tests` | Copy colocated tests to `modules/<name>/tests/` |

`--with-stubs` does not copy routes. Combine with `--with-routes`.

`--with-controllers` implies `--with-adapters`. `--with-validators`
implies the Vine provider. `--with-stubs` implies controllers,
validators, adapters, and `start/`.

`--wire-routes` requires `start/routes/<name>.ts` to exist (copy it
with `--with-routes` or create it). Missing file: exit 1.

## check flags

These flags are on [`check`](../cli/check.md) only.

| Flag | Default | Effect |
|------|---------|--------|
| `--strict` | `false` | Exit 1 when any warning was printed |

See [CLI overview](../cli/overview.md),
[`adonia.json`](./adonia-json.md), and [`add`](../cli/add.md).
