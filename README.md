# Adonia

Turborepo for the Adonia CLI (`packages/modules`, npm name `adonia`) and
the AdonisJS 7 fixture app (`apps/adonis-api-stater`).

**GitHub:** https://github.com/britzdylan/adonia

## Layout

```text
adonia/
  packages/modules/          # npm package "adonia" (CLI + bundled registry)
  apps/adonis-api-stater/    # authoring fixture (module sources live here)
  apps/docs/                 # VitePress site (Cloudflare Workers)
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
npx adonia@latest add auth --with-adapters
npx adonia@latest add auth --with-stubs
npx adonia@latest add auth --with-routes --wire-routes
# or:
npx adonia@latest init --scaffold
```

Plain `add` copies module files under `modules/` only. Host models,
migrations, controllers, validators, adapters, and routes are opt-in.
Adonis packages used by stubs (`@adonisjs/mail`, `@adonisjs/drive`,
`@adonisjs/limiter`) must already be configured; otherwise `add` and
`check` print `node ace add @adonisjs/<pkg>`.

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

## Docs site

VitePress lives in `apps/docs`. Local:

```bash
npm run docs:dev
npm run docs:build
```

Pushes to `main` deploy the VitePress build to a Cloudflare Worker via
`.github/workflows/docs.yml`. Pull requests build only. Set repository
secrets:

- `CLOUDFLARE_API_TOKEN` — API token with **Edit Cloudflare Workers**
- `CLOUDFLARE_ACCOUNT_ID` — account id from the Cloudflare dashboard

The first `wrangler deploy` creates the `adonia-docs` Worker. Do not
also enable Cloudflare Workers Builds on this repo, or you will
double-deploy. Wrangler prints the `workers.dev` URL on deploy.

## License

MIT
