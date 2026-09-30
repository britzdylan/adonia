# Switch Adonia docs to VitePress Carbon

Mode: feature
Project: Adonia

Replace the stock VitePress default theme in `apps/docs` with
[VitePress Carbon](https://carbon.breno.tech/) (`vitepress-carbon`).
Carbon is a drop-in GitHub-inspired docs theme. Nav, sidebar, search,
and markdown files stay as they are.

## Goals

- Docs site uses Carbon in `dev`, `build`, and CI.
- Existing `themeConfig` (nav, sidebar, local search, GitHub link)
  keeps working without a rewrite.
- Home page (`layout: home`) still renders.
- Light and dark modes both work.
- Optional brand tokens live in one CSS file, not a fork of the theme.

## Non-goals

- Writing guide copy.
- Changing IA, routes, or sidebar groups.
- Blog features, Algolia, versioned docs, or deploy.
- Custom Vue components or layout slots (unless Carbon requires a
  logo slot).
- Switching the theme later (Trito, Theme +, Teek).

## Surfaces

| Area | Files |
|------|--------|
| Theme entry | `apps/docs/.vitepress/theme/index.ts` (new) |
| Optional tokens | `apps/docs/.vitepress/theme/custom.css` (new) |
| Site config | `apps/docs/.vitepress/config.mts` |
| Deps | `apps/docs/package.json`, root lockfile |
| CI | already runs `npm run build -w docs`; must stay green |

VitePress uses a custom theme **only** when
`.vitepress/theme/index.ts` exists. Creating that file is the
switch.

## Install

From the repo root:

```bash
npm install -w docs -D vitepress-carbon
```

Pin a current 1.x that lists VitePress `^1.6` as a peer. Do not
introduce `vpcar` or the Carbon starter template. This repo already
has a docs app.

## Theme entry

Create `apps/docs/.vitepress/theme/index.ts`:

```ts
import { VPCarbon } from 'vitepress-carbon'
import './custom.css'

export default VPCarbon
```

If later work registers Vue components, spread the theme and call
Carbon's `enhanceApp` first:

```ts
import { VPCarbon } from 'vitepress-carbon'
import './custom.css'

export default {
  ...VPCarbon,
  enhanceApp(ctx) {
    VPCarbon.enhanceApp?.(ctx)
  },
}
```

Do not `extends: DefaultTheme` from `vitepress/theme` at the same
time. Carbon replaces the default theme.

## Vite SSR

If `vitepress build` fails to resolve the theme under Node SSR, add
to `config.mts`:

```ts
vite: {
  ssr: {
    noExternal: ['vitepress-carbon'],
  },
},
```

Add this only if the first build fails. Prefer the smallest config
that compiles.

## Site config

Keep `defineConfig` from `vitepress`. Do **not** switch to a Carbon
config wrapper unless their docs require it for types.

Leave `themeConfig` as-is:

- `nav`, `sidebar`, `search.provider: 'local'`, `socialLinks`

Optional Carbon-safe extras (only if they render with Carbon and
do not need new assets in this pass):

- `themeConfig.logo` when a logo file exists under `apps/docs/public/`
- `lastUpdated: true` if Carbon shows it and it is not already set

Do not add a logo until there is a real SVG. A broken logo is worse
than none.

## Brand tokens (light touch)

Add `apps/docs/.vitepress/theme/custom.css` imported from the theme
entry. Override Carbon `--vp-*` variables only where Adonia needs
an accent. Prefer:

- `--vp-c-brand-1` / `--vp-c-brand-2` / `--vp-c-brand-3`
- Dark variants under `.dark` if Carbon uses that selector

Do not hardcode colors on components. Do not restyle the whole
layout. If no brand palette is decided, ship Carbon defaults and
leave `custom.css` empty except for a short comment.

Source of truth for tokens:
[Carbon `vars.css`](https://github.com/brenoepics/vitepress-carbon/blob/main/packages/theme/src/theme/styles/vars.css)
and [extending the theme](https://carbon.breno.tech/guide/extending-theme).

## Home page

`apps/docs/index.md` stays `layout: home` with the existing hero.
After the switch, eyeball:

- Hero name, tagline, and three actions
- Dark-mode toggle
- Nav + search on an inner page (`/guide/what-is-adonia`)

If Carbon's home layout ignores some default-theme hero keys, keep
the markdown and only adjust frontmatter keys Carbon documents.
Do not invent a custom homepage Vue component in this pass.

## Verification

From repo root:

```bash
npm install
npm run docs:build
```

Also run `npm run docs:dev` and click Guide, CLI, Modules,
Reference, and the home actions.

CI already builds docs (`npm run build -w docs`). That step must
pass after the theme change.

## Acceptance

1. `apps/docs/.vitepress/theme/index.ts` re-exports `VPCarbon`.
2. `vitepress-carbon` is a `docs` workspace devDependency.
3. `npm run docs:build` exits 0.
4. Sidebar, nav, and local search still work.
5. Light and dark both readable (no missing contrast on hero or
   code blocks).
6. No markdown IA changes. Placeholder pages stay placeholders.

## Out of scope follow-ups

- Logo, favicon, og image.
- `editLink` to GitHub `apps/docs`.
- Layout slots (`navbar-icon`).
- Deploy of `.vitepress/dist`.

## Goal

```
Name: Adopt VitePress Carbon on apps/docs
Record: proposed
Status: Not started
Timeframe:
Key Results: docs build uses Carbon; nav/sidebar unchanged; CI
  docs build green
Notes: drop-in theme; optional CSS tokens only
```

## Task

```
Name: Install vitepress-carbon and add theme entry
Record: proposed
Status: Not started
Parent: Adopt VitePress Carbon on apps/docs
Notes: theme/index.ts; SSR noExternal only if build fails;
  custom.css for brand tokens if needed
```
