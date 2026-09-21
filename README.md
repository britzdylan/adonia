# Adonia

Turborepo for the Adonia CLI (`packages/modules`, npm name `adonia`) and
the AdonisJS 7 fixture app (`apps/adonis-api-stater`).

**GitHub:** https://github.com/britzdylan/adonia

## Layout

```text
adonia/
  packages/modules/          # npm package "adonia" (CLI + bundled registry)
  apps/adonis-api-stater/    # authoring fixture (module sources live here)
```

Author modules under `apps/adonis-api-stater/modules/`, then:

```bash
npm run sync-registry   # copies fixture modules → packages/modules/registry/
npm test -w adonia
```

## Host install (published package)

```bash
npx adonia@latest init --wire
npx adonia@latest add auth
```

## Monorepo development

```bash
npm install
npm run build
npm test -w adonia

# exercise CLI against the fixture tree
node packages/modules/build/cli.js add auth \
  --cwd /tmp/some-host \
  --registry apps/adonis-api-stater/modules
```

## License

MIT
