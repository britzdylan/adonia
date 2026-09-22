# `@adonia` CLI (`packages/modules`)

npm package name: `adonia`. Bin: `adonia`.

In this monorepo, module sources are authored in
`apps/adonis-api-stater/modules/`. Sync before pack/test:

```bash
npm run sync-registry -w adonia
npm test -w adonia
```

## Host install

```bash
npx adonia@latest init --wire
npx adonia@latest add auth
# optional host scaffolding:
npx adonia@latest add auth --with-stubs
npx adonia@latest add auth --with-routes --wire-routes
# or full kit:
npx adonia@latest init --scaffold
```

## Commands

| Command | Role |
|---------|------|
| `init` / `init --wire` | `adonia.json` + core; optional host wiring |
| `init --scaffold` | Core + all feature modules with stubs and routes (implies `--wire`) |
| `add [names…]` | Copy module files under `modules/`, merge config (no app stubs by default) |
| `list` / `diff` / `check` | Discovery, drift, validation |

### `add` scaffolding flags

| Flag | Effect |
|------|--------|
| `--with-models` | Copy `stubs/models/**` |
| `--with-migrations` | Copy `stubs/migrations/**` |
| `--with-controllers` | Copy `stubs/controllers/**` |
| `--with-validators` | Copy `stubs/validators/**` |
| `--with-stubs` | All four above (not routes) |
| `--with-routes` | Copy `stubs/routes/**` → `start/routes/` |
| `--wire-routes` | Append `import './routes/<name>.js'` in `start/routes.ts` |
| `--with-tests` | Copy colocated module tests |

`diff` accepts the same `--with-*` flags; without them it diffs the
module tree only.

Shared flags: `--yes`, `--dry-run`, `--cwd`, `--registry`, `--overwrite`.

## Developing in the monorepo

```bash
node packages/modules/build/cli.js add auth \
  --registry apps/adonis-api-stater/modules
```
