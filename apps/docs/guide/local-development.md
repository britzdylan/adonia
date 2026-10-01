# Local development

This is for authoring Adonia itself. If you only consume the
published CLI, stop at [getting started](./getting-started.md).

You edit module sources in this monorepo, point the CLI at that
tree, and sync the bundled registry.

## Layout

The git repository is a Turborepo:

```text
adonia/
  packages/modules/             CLI + bundled registry (npm name adonia)
  apps/adonis-api-stater/       Fixture Adonis app; module authoring source
  apps/docs/                    VitePress documentation
```

Module sources you edit live under
`apps/adonis-api-stater/modules/`. Hosts do **not** copy from that
folder by browsing it. They run the CLI. The fixture exists so
slices can be designed and tested inside a real Adonis app.

Import paths inside a module are `#modules/<name>/…` (for example
`#modules/auth/service`).

## Build the CLI

From the monorepo root:

```bash
npm install
npm run build
```

The binary is `packages/modules/build/cli.js`. Package scripts:

```bash
npm test -w adonia
npm run sync-registry
npm run docs:dev
```

`npm test -w adonia` syncs the registry, builds the CLI, and runs
the CLI tests. Tests spawn `build/cli.js`, so run them against a
fresh build.

## Point add at the fixture

`--registry` wins over `adonia.json`. Exercise a host directory
against the authoring tree:

```bash
node packages/modules/build/cli.js add auth \
  --cwd /tmp/my-host \
  --registry apps/adonis-api-stater/modules
```

`adonia list` then prints `Registry (flag):` and that path. Use the
same flag on `init`, `diff`, and `check`.

A host that already has `adonia.json` can set `registry` to a
relative local path instead of `"bundled"`. `github:…` values fail
closed in `0.1.x`.

Inside the fixture, authors can also run:

```bash
npx adonia add auth --registry .
```

from `apps/adonis-api-stater/modules` when they want that tree as
the registry root.

## Sync the bundled registry

`npm run sync-registry` (from the repo root, or
`npm run sync-registry -w adonia`) deletes
`packages/modules/registry/` and copies
`apps/adonis-api-stater/modules/` over it. That folder is what the
published tarball ships as the bundled registry.

`prepack` on the `adonia` workspace runs sync then build. If you
change a module and only rebuild the CLI, `npx adonia` from a
packed tarball still wants a current `registry/` tree.

## Authoring a module

Add or edit a folder under `apps/adonis-api-stater/modules/`, keep
`module.json` in the
[`module.json` schema](../reference/module-json.md), and list the
name in `registry.json` (`core` or `modules`). Feature modules
declare `registryDependencies`, `events`, `stubs`, and peer models
the same way the bundled slices do.

Copy policy, stub flags, and events merge are unchanged: they are
the same CLI you ship. Iterate with `--registry` pointing at the
fixture, then sync before you pack.

<!-- prettier-ignore -->
> [!NOTE]
> The fixture `modules/README.md` is the authoring checklist for
> that tree. Prefer `npx adonia` (or `build/cli.js`) over copying
> files by hand into a host.

## Docs app

The VitePress app is `apps/docs`. From the monorepo root:

```bash
npm run docs:dev
npm run docs:build
```

Production deploys to a Cloudflare Worker from GitHub Actions. You do
not run Wrangler locally unless you are testing the docs Worker.

Guide, CLI, and module pages live next to each other under
`apps/docs/`. Match existing voice and 80-character wrap when you
edit them.

## Next steps

Validate a change the way CI does:

1. Run `npm test -w adonia` after CLI or registry edits.
2. `adonia check --cwd <host> --registry <fixture>` on a throwaway
   app.
3. Return to the [CLI overview](../cli/overview.md) for flags, or
   the [modules overview](../modules/overview.md) for slice APIs.
