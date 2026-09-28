# CLI overview

The Adonia CLI copies modules from a registry into an AdonisJS host.
You run it with `npx adonia` (or `adonia` after a local install). It
does not replace `node ace`; it only manages the module tree,
optional stubs, and host wiring.

This page is the map of commands, shared flags, and how the CLI
resolves a registry. Use the command pages for the full flag lists
and side effects.

## Install and run

The published package name is `adonia`. Node.js 20 or later is
required.

```bash
npx adonia@latest --help
npx adonia@latest init --wire
```

In this monorepo, after `npm run build`:

```bash
node packages/modules/build/cli.js --help
```

Every command accepts `--cwd <dir>` so you can point at a host that
isn't the current working directory.

## Commands

Five commands cover install, inspect, and validate:

| Command | Role |
|---------|------|
| [`init`](./init.md) | Write `adonia.json`, copy core, optionally wire the host |
| [`add`](./add.md) | Copy one or more modules (and optional stubs) |
| [`list`](./list.md) | Print registry names and install status |
| [`diff`](./diff.md) | Compare host files to the registry |
| [`check`](./check.md) | Validate the host install |

A typical host session looks like this:

```bash
npx adonia init --wire
npx adonia add auth
npx adonia add auth --with-adapters
npx adonia add auth --with-routes --wire-routes
npx adonia check
```

`init --scaffold` is the all-in shortcut: wire the host, copy core,
then add every feature module with stubs and routes. See
[`init`](./init.md#scaffold).

## Shared flags

These flags sit on the root `adonia` program, so they apply to every
command. The complete catalog is in
[CLI flags](../reference/cli-flags.md).

| Flag | Effect |
|------|--------|
| `--cwd <dir>` | Host app directory (default: current directory) |
| `-y`, `--yes` | Skip the “continuing” / core-install log lines |
| `--dry-run` | Print the plan; write nothing |
| `--registry <dir>` | Local registry path (wins over `adonia.json`) |
| `--overwrite` | Replace host files whose contents differ |

`--yes` does not wait for a prompt. The CLI never reads stdin for
confirmation; `--yes` only hides the lines that mention continuing.

`--overwrite` is also declared on [`add`](./add.md). Passing it
before or after the command name both work:
`adonia --overwrite add auth` and `adonia add auth --overwrite`.

## Registry resolution

The CLI picks a registry in this order:

1. `--registry <dir>` if you pass it.
2. `adonia.json` `registry` when it is `"bundled"` or empty.
3. Any other `adonia.json` `registry` string as a path relative to
   `--cwd`.

`github:…` registries are not supported in `adonia@0.1.x`. The CLI
exits with an error and does not fall back to the bundled registry.

`--registry` is the switch for local authoring. From the monorepo
root:

```bash
node packages/modules/build/cli.js add auth \
  --cwd /tmp/my-host \
  --registry apps/adonis-api-stater/modules
```

`adonia list` prints `Registry (flag):` or `Registry (bundled):`
plus the resolved root so you can confirm which tree you hit.

## Host config

Most commands (except `list` without a config file) read
[`adonia.json`](../reference/adonia-json.md). `init` writes it when
the file is missing. A legacy `modules.json` is still read if
`adonia.json` is absent; new writes always go to `adonia.json`.

`init` refuses to run unless the directory looks like an Adonis app:
`adonisrc.ts` exists, `package.json` exists, and
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

## Next steps

Start a host, then add a slice:

1. Run [`init`](./init.md) with `--wire` on an AdonisJS app.
2. [`add`](./add.md) a feature module from the
   [modules overview](../modules/overview.md).
3. [`check`](./check.md) the install before you ship.
