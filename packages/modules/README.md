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
```

## Commands

| Command | Role |
|---------|------|
| `init` / `init --wire` | `adonia.json` + core; optional host wiring |
| `add [names…]` | Copy files/stubs, merge config |
| `list` / `diff` / `check` | Discovery, drift, validation |

Shared flags: `--yes`, `--dry-run`, `--cwd`, `--registry`, `--overwrite`.

## Developing in the monorepo

```bash
node packages/modules/build/cli.js add auth \
  --registry apps/adonis-api-stater/modules
```
