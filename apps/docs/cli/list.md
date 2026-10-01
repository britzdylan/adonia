# list

`list` prints every name in the resolved registry and whether it
appears in `adonia.json` `installed`.

## Run it

```bash
npx adonia list
npx adonia list --registry apps/adonis-api-stater/modules
```

No extra command flags. Shared flags such as `--cwd` and
`--registry` still apply. See
[CLI flags](../reference/cli-flags.md#shared-flags).

## Output

The first line is the resolved registry:

```text
Registry (bundled): /path/to/node_modules/adonia/registry

  api              [installed]  Shared ApiService, envelopes, …
  types            [installed]  Shared types package
  auth             [available]  Email registration, login, …
```

`Registry (flag):` means `--registry` (or a local path in
`adonia.json`) won. `Registry (bundled):` means the package's
bundled tree.

Each following line is a name, a status in brackets, and the
manifest `description` when `module.json` parses.

| Status | Meaning |
|--------|---------|
| `installed` | Name is in `adonia.json` `installed` |
| `available` | In the registry, not in `installed` |

Status is the config list, not a disk check. A folder that exists
but isn't recorded still prints `available`. [`check`](./check.md)
is the command that verifies folders and peer files.

Core names (`api`, `types`, `constants`, `contracts`) and feature
names print in the registry index order.

## Without adonia.json

If `adonia.json` (and legacy `modules.json`) are missing, `list`
still runs. It prints
`(no adonia.json — showing registry only; run npx adonia init)`
and treats every name as `available`.

`--registry` is enough in that situation. Without it, resolution
falls through to the bundled registry, or fails if that tree is
missing.

A `github:…` `registry` value in `adonia.json` fails closed: `list`
exits non-zero and does not copy or fall back. See
[registry resolution](./overview.md#registry-resolution).

See [`init`](./init.md), [`add`](./add.md), and
[modules](../modules/overview.md).
