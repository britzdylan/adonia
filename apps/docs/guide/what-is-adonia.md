# What is Adonia

Adonia is a CLI and a set of AdonisJS modules. You run it in an
AdonisJS app you already have. It copies the modules you ask for
into that app as ordinary source.

`npx adonia add auth` puts an auth service, its contracts, and a
manifest in `modules/auth`. Those files live in your repo. You
edit them like any other file. They are not a package you import
from `node_modules`.

The bundled set is auth, accounts, notifications, Creem billing,
and subscriptions, plus a shared API core that `init` copies
first.

## What you need

An AdonisJS 7 app (`adonisrc.ts` and `@adonisjs/core`). Node.js 24
or later, and npm 11 or later. Create one if you don't have it yet:

```bash
npm create adonisjs@latest my-api -- --kit=api
cd my-api
npx adonia@latest init --wire
npx adonia@latest add auth
```

`init --wire` prepares the app. `add auth` copies the auth module.
[Getting started](./getting-started.md) walks through that, plus
models, routes, and `check`.

## What you get, and what you don't

You get source under `modules/`. You own it after the copy.
[`diff`](../cli/diff.md) compares it with the registry.
[`add --overwrite`](../cli/add.md) puts the registry version back.

You do not get a replacement for your app. Adonia does not generate
a new project. Routes, Lucid models, and HTTP adapters are optional
flags, because they have to match the app they land in.

To copy every module at once, with example routes and models, see
[scaffolding](./scaffolding.md).

## Next steps

1. [Getting started](./getting-started.md) — create an app and add
   auth.
2. [Modules](../modules/overview.md) — what each module does.
3. [Concepts](./concepts.md) — after you have run `add`, how
   domain files differ from host stubs.
