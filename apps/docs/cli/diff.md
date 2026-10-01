# diff

`diff` compares the host copy of a module to the registry. Matching
files stay quiet. Missing or changed files print. Exit 1 when
anything differed.

## Run it

`adonia.json` must exist. Pass exactly one module name:

```bash
npx adonia diff auth
npx adonia diff auth --with-stubs
npx adonia diff auth --with-adapters --with-routes
```

With no name, `diff` prints `Usage: adonia diff <name>` and exits 1.

Unknown names fail when the registry has no `module.json` for them
(core packages `types`, `constants`, and `contracts` still resolve
through the implied manifest).

## What is compared

By default, `diff` plans the same **domain slice** as
[`add`](./add.md) without stub flags: files listed in `module.json`
`files`, copied to `paths.modules`.

Pass the same `--with-*` stub flags as `add` to include those host
paths in the comparison. Without them, an edited `app/models/user.ts`
does not appear in `adonia diff auth`.

`--with-tests` is accepted on the command line because `diff` shares
the stub option parser with `add`. `diff` does **not** compare test
files. That flag has no effect here.

`--wire-routes` is likewise accepted and unused: `diff` never edits
`start/routes.ts`.

## Output

For each planned destination:

- Missing file: `--- missing: <path-relative-to-cwd>`
- Same SHA-256 as the registry: no line
- Different contents: a two-file header plus line-level marks

Changed files look like this:

```text
--- registry/modules/auth/service.ts
+++ host/modules/auth/service.ts
-  namespace = 'auth'
+  namespace = 'host-auth'
```

The format is not a hunked unified diff. Every changed line from
either side is emitted in order (`-` registry, `+` host). Identical
lines are omitted.

When every planned file exists and matches, `diff` prints
`No differences.` and exits 0. Any missing or changed file sets
exit code 1.

Stub-plan warnings (unknown stub folders, and similar) print to
stderr the same way [`add`](./add.md) does.

## Flags

`diff` accepts the [shared flags](../reference/cli-flags.md#shared-flags)
and the [stub flags](../reference/cli-flags.md#stub-flags).
`--overwrite` and `--dry-run` do not change `diff`: it never writes
host files.

Recopy with [`add`](./add.md) `--overwrite` to put the registry
version back. [`check`](./check.md) covers folders, peer models,
and wiring; `diff` does not.
