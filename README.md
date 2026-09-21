# Adonia

Adonia is a shadcn-style module library for any AdonisJS 7 API. The CLI
and registry ship together on npm.

**Repo:** https://github.com/britzdylan/adonia  
**npm:** `adonia`

```bash
npm init adonisjs@latest my-api -- --kit api
cd my-api
npx adonia@latest init --wire
npx adonia@latest add auth
node ace migration:run
```

## Commands

| Command | Role |
|---------|------|
| `init` | Write `adonia.json`, copy API core |
| `init --wire` | Also patch aliases, provider, exception handler, `config/modules.ts` |
| `list` | Available vs `installed` |
| `add [names…]` | Resolve deps, copy files/stubs, merge config |
| `diff [name]` | Unified diff host vs registry (exit 1 if dirty) |
| `check` | Validate folders, peerModels, aliases, events |

Shared flags: `--yes`, `--dry-run`, `--cwd <dir>`, `--registry <dir>`, `--overwrite`.

## `adonia.json`

Default registry is `"bundled"` (the `registry/` folder inside this
package). Schema: `schema/adonia.schema.json`.

## Developing Adonia

`registry/` is the source of truth for module sources. The example app
at `examples/api` is filled by applying the CLI — do not maintain a
second copy of modules there.

```bash
npm install
npm test

# after editing registry/auth/…
npm run build
npm run apply-to-example
cd examples/api && npm run typecheck
```

Optional flag for one-off applies:

```bash
node build/cli.js add auth --cwd examples/api --registry registry --overwrite --yes
```

## License

MIT
