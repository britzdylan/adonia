# CLI overview

`adonia` copies modules from a registry into an AdonisJS host. It
does not replace `node ace`.

```bash
npx adonia@latest --help
npx adonia@latest init --wire
```

Node.js 24 or later, and npm 11 or later. After `npm run build`
in this monorepo:

```bash
node packages/modules/build/cli.js --help
```

Every command accepts `--cwd <dir>`.

## Commands

| Command | Role |
|---------|------|
| [`init`](./init.md) | Write `adonia.json`, copy core, optionally wire the host |
| [`add`](./add.md) | Copy one or more modules (and optional stubs) |
| [`list`](./list.md) | Print registry names and install status |
| [`diff`](./diff.md) | Compare host files to the registry |
| [`check`](./check.md) | Validate the host install |

```bash
npx adonia init --wire
npx adonia add auth
npx adonia add auth --with-adapters
npx adonia add auth --with-routes --wire-routes
npx adonia check
```

`init --scaffold` wires the host, copies core, then adds every
feature module with stubs and routes. See
[`init`](./init.md#scaffold). Why you would choose that path is in
the [Guide](../guide/scaffolding.md).

## Shared flags

These flags sit on the root `adonia` program. The complete catalog
is [CLI flags](../reference/cli-flags.md).

| Flag | Effect |
|------|--------|
| `--cwd <dir>` | Host app directory (default: current directory) |
| `-y`, `--yes` | Hide the “continuing” / core-install log lines |
| `--dry-run` | Print the plan; write nothing |
| `--registry <dir>` | Local registry path (wins over `adonia.json`) |
| `--overwrite` | Replace host files whose contents differ |

`--yes` does not prompt. The CLI never reads stdin for
confirmation; `--yes` only hides the lines that mention continuing.

`--overwrite` is also declared on [`add`](./add.md). Either order
works: `adonia --overwrite add auth` and
`adonia add auth --overwrite`.

## Registry resolution

1. `--registry <dir>` if you pass it.
2. `adonia.json` `registry` when it is `"bundled"` or empty.
3. Any other `adonia.json` `registry` string as a path relative to
   `--cwd`.

`github:…` registries fail closed in `adonia@0.1.x`. The CLI exits
and does not fall back to the bundled registry.

```bash
node packages/modules/build/cli.js add auth \
  --cwd /tmp/my-host \
  --registry apps/adonis-api-stater/modules
```

`adonia list` prints `Registry (flag):` or `Registry (bundled):`
plus the resolved root.

## Host config

Most commands (except `list` without a config file) read
[`adonia.json`](../reference/adonia-json.md). `init` writes it when
the file is missing. A legacy `modules.json` is still read if
`adonia.json` is absent; new writes always go to `adonia.json`.

`init` refuses to run unless the directory looks like an Adonis
app: `adonisrc.ts` exists, `package.json` exists, and
`@adonisjs/core` is a dependency.

## Copy policy

`add` (and the core copy inside `init`) hashes each source and
destination file:

- Missing destination: copy (or `would-copy` on `--dry-run`).
- Same hash: skip.
- Different hash, no `--overwrite`: conflict; exit 1.
- Different hash, `--overwrite`: replace.

A module is recorded in `adonia.json` `installed` only when every
planned file for that module copies without a conflict. Conflicts
leave the name off the list so a retry still plans the copy.
