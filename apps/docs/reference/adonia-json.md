# adonia.json

`adonia.json` is the host manifest. `init` writes it at the app root.
Every command except `list` (when the file is missing) reads it.
Parsed with Zod (`hostModulesSchema`) and, after install, the JSON
Schema at `adonia/schema/adonia.schema.json`.

## Location and schema

The file lives at `<cwd>/adonia.json`. If it is absent, the CLI
still **reads** a legacy `<cwd>/modules.json` when that file exists.
New writes always go to `adonia.json`.

`init` sets `$schema` to
`./node_modules/adonia/schema/adonia.schema.json` so editors can
validate. The package export is
`adonia/schema/adonia.schema.json`. Extra top-level keys are
rejected (`additionalProperties: false`).

Required keys: `registry`, `ref`, `paths`, `aliases`, `installed`.
`$schema` is optional.

## Default file

`npx adonia init` writes this shape when the file is missing
(`ref` is the CLI package version, currently `0.1.0`):

```json
{
  "$schema": "./node_modules/adonia/schema/adonia.schema.json",
  "registry": "bundled",
  "ref": "0.1.0",
  "paths": {
    "modules": "modules",
    "models": "app/models",
    "migrations": "database/migrations",
    "controllers": "app/controllers",
    "validators": "app/validators"
  },
  "aliases": {
    "modules": "#modules",
    "constants": "#constants",
    "models": "#models"
  },
  "installed": []
}
```

If `adonia.json` already exists, `init` keeps it and does not
rewrite these defaults.

## registry

`registry` selects which module tree `add`, `list`, `diff`, and
`check` read. Resolution order is documented on
[CLI overview](../cli/overview.md#registry-resolution).

| Value | Effect |
|-------|--------|
| `"bundled"` or `""` | Package registry (`node_modules/adonia/registry`) |
| Local path | Directory relative to `--cwd` |
| `github:…` | Error in `adonia@0.1.x`; no bundled fallback |

`--registry <dir>` on the command line always wins over this field.

An unknown non-GitHub string that is not a real path prints
`Unknown registry "…"; using bundled.` and continues with the
bundled tree.

## ref

`ref` is a required non-empty string. `init` sets it to the CLI
version. In `adonia@0.1.x` it is **not** used to pin or fetch a
registry revision. Keep a value that satisfies the schema.

## paths

`paths` maps copy destinations. These five keys are required.
Additional string keys are allowed; [`check`](../cli/check.md)
warns when any listed path is missing on disk.

| Key | Default | Used when |
|-----|---------|-----------|
| `modules` | `modules` | Domain slice (`modules/<name>/`) |
| `models` | `app/models` | `--with-models` / `--with-stubs` |
| `migrations` | `database/migrations` | `--with-migrations` / `--with-stubs` |
| `controllers` | `app/controllers` | `--with-controllers` / `--with-stubs` |
| `validators` | `app/validators` | `--with-validators` / `--with-stubs` |

These destinations are **not** taken from `paths`. They are fixed:

- Routes → `start/routes/`
- Vine provider → `providers/`
- Limiter / start stubs → `start/`
- Adapters → `app/adapters/`

Peer-model checks resolve `#models/user` to
`<cwd>/<paths.models>/user.ts`.

## aliases

`aliases` requires `modules`, `constants`, and `models`. Extra
string keys are allowed. `init` writes `#modules`, `#constants`,
and `#models`.

In `adonia@0.1.x` the CLI does **not** read this object to apply
imports. [`init --wire`](../guide/host-wiring.md) merges a fixed
`package.json` `"imports"` map (`#modules/*`, `#constants`,
`#adapters/*`, and the rest). [`check`](../cli/check.md) looks at
those same keys on `package.json`, not at `adonia.json` `aliases`.
Keep the field in sync with the host so the file stays a complete
manifest.

## installed

`installed` is the list of module names the CLI treats as present.
[`list`](../cli/list.md) marks those names `installed`.
[`add`](../cli/add.md) skips them unless you pass `--overwrite`.
[`check`](../cli/check.md) walks this list for folders,
`registryDependencies`, and peer models.

A name is appended only when every planned file for that module
copies without a conflict. `--dry-run` never updates the array.
Hand-editing the list without the folders will make `check` fail.

After a successful `init` (core installed) you typically see
`api`, `types`, `constants`, and `contracts`. Feature names appear
as you `add` them.

See [`module.json`](./module-json.md) and
[CLI flags](./cli-flags.md). Why `--wire` writes the import map is
in [host wiring](../guide/host-wiring.md).
