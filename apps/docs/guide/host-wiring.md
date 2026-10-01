# Host wiring

Domain files under `modules/` do not boot. You still need import
aliases, the API provider, the JSON exception handler, and
`config/modules.ts`. `--wire` writes those pieces.

```bash
npx adonia init --wire
```

`--scaffold` implies `--wire`. Without `--wire`, `init` prints a
checklist and does not edit `package.json`, `adonisrc.ts`, or
`start/kernel.ts`. See [`init`](../cli/init.md#wire-the-host).

`adonia check` warns when aliases, the provider, or the exception
handler are missing. It does not apply wiring.

## Import aliases

`--wire` fills **missing** keys on `package.json` `"imports"`. If
a key already exists with a different path, that override is kept.

| Alias | Target |
|-------|--------|
| `#modules/*` | `./modules/*.js` |
| `#modules/types` | `./modules/types/index.js` |
| `#modules/contracts` | `./modules/contracts/index.js` |
| `#constants` | `./modules/constants/index.js` |
| `#constants/*` | `./modules/constants/*.js` |
| `#adapters/*` | `./app/adapters/*.js` |

You still need Adonis's own aliases (`#models/*`, `#controllers/*`,
`#start/*`, and the rest). `--wire` does not add those.

After adapters land in `app/adapters/`, import them as
`#adapters/auth` (file `app/adapters/auth.ts`).

## API provider

Wiring appends this line to `adonisrc.ts` `providers` when the file
does not already mention `#modules/api/provider`:

```ts
() => import('#modules/api/provider'),
```

The provider registers `ctx.respond` and `ctx.serialize` on
`HttpContext`. Controllers use `ctx.respond` to emit the shared
envelope. See [`api`](../modules/api.md#ctxrespond).

## Exception handler

Wiring sets the HTTP server error handler in `start/kernel.ts`:

```ts
server.errorHandler(() => import('#modules/api/exception_handler'))
```

If `start/kernel.ts` is missing, `--wire` creates it with a
`server` import and that line. If the file exists but has no
`server` import and no `server.` usage, `--wire` prepends the
import so the new line compiles.

It also writes `app/exceptions/handler.ts` as:

```ts
export { default } from '#modules/api/exception_handler'
```

when that file is missing, or still looks like the Adonis default
(imports `@adonisjs/core/exceptions`, is very short, or declares
`export default class HttpExceptionHandler`). A custom handler that
is not that default is left alone, even if it does not re-export
the Adonia handler.

## config/modules.ts

If `config/modules.ts` is missing, `--wire` creates an empty
record. Feature [`add`](../cli/add.md) then inserts each module's
`description` and `emits` list. `emitSafe` reads
`config.get('modules.<namespace>')` and only emits names in
`emits`.

Edit `emits` to silence an event without changing the service.
Do not remove the object's `auth:` (or other) key if
[`check`](../cli/check.md) is looking for that `configKeys` leaf.

## Route wiring is separate

`init --wire` does **not** mount feature routes.
`--wire-routes` on [`add`](../cli/add.md) appends:

```ts
import './routes/auth.js'
```

to `start/routes.ts` when `start/routes/auth.ts` exists. That file
comes from `--with-routes` (or a file you created). Mounting is
idempotent if the import (or `#start/routes/<name>`) is already
there.

`--scaffold` passes `--wire-routes` for every feature that has
route stubs.

## Vine provider

`--with-validators` and `--with-stubs` copy
`providers/vine_provider.ts`. `--wire` does not register it.
Add the provider to `adonisrc.ts` yourself so unique/exists macros
load. `add` prints that reminder in its next-steps footer.

## Next steps

Confirm wiring, then copy a slice:

1. Run [`check`](../cli/check.md) and clear provider / alias
   warnings.
2. Continue [getting started](./getting-started.md) with
   `adonia add auth`.
3. Author against a local registry in
   [local development](./local-development.md).
