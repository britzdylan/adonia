# Docs voice: three tones

Mode: feature
Project: Adonia

Rewrite `apps/docs` so each section uses a distinct voice, modeled on
three OSS packages. Do not change IA, Carbon, or CLI behavior. Pages
already have accurate copy; this pass changes **how** they speak.

Models:

| Section | Model | Job |
|---------|--------|-----|
| Home hero | [htmx](https://htmx.org/) | One punch line, then leave |
| Guide | [shadcn/ui](https://ui.shadcn.com/docs) | Why it exists, then principles |
| CLI + Reference | [ripgrep](https://github.com/BurntSushi/ripgrep) | What it does, flags, tables |
| Modules | Mix | Catalog like ripgrep; first screen like shadcn |

## Goals

- A reader can tell Guide from CLI by voice alone.
- Facts stay true to the CLI and `module.json` files. Do not invent
  flags, routes, or behavior.
- Home stays a VitePress `layout: home` hero. No extra homepage
  sections, haiku, or manifesto essay.
- Root `README.md` and `packages/modules/README.md` stay
  ripgrep-shaped (short definition, commands, tables). Align wording
  with the docs site where they overlap.

## Non-goals

- New pages, nav items, or Carbon theme work.
- Filling gaps in account stubs or CLI tests.
- Matching shadcn/htmx/ripgrep visually.
- A blog, changelog-as-docs, or versioned docs.

## Voice rules

### Home (htmx)

`apps/docs/index.md` only.

- `hero.tagline`: one sentence, argument not description.
- Do not explain modules, flags, or `adonia.json` on the home page.
- Three actions stay: Getting started, CLI, GitHub.
- Optional `hero.name` stays `Adonia`. Do not add `hero.text` unless
  Carbon needs it for layout.
- Banned on home: “Turborepo”, “fixture”, “shadcn-style”, feature
  lists, install steps.

Draft tagline (edit if something sharper is true):

```text
Your AdonisJS app owns the files. Adonia only copies them in.
```

Site `description` in `.vitepress/config.mts` must match that idea
in one line (SEO), not a second slogan.

### Guide (shadcn)

Files under `apps/docs/guide/`.

- Second person. Name the default you reject (install a package,
  wrap it forever), then state how Adonia differs (copy source into
  `modules/`).
- Lead with **principles**, then a short command block.
- Headings are ideas where it helps: “Open source in the host”,
  “Domain versus stubs”, “You wire HTTP”.
- Short paragraphs. No benchmark tables. No “elegantly”.
- `what-is-adonia.md` is the positioning page. Open with a line
  that could sit under shadcn’s “This is not a component library.”
  Example shape (rewrite; do not paste shadcn):

  ```text
  This is not an Adonis starter kit. It is how you add auth
  (and the rest) as source you already own.
  ```

- `concepts.md` keeps the glossary but opens with the domain /
  stub split as a principle, not a term dump.
- `getting-started.md` can stay procedural; keep the first
  paragraph as “why these steps” (one beat), then the commands.
- `scaffolding.md`, `host-wiring.md`, `local-development.md`:
  same voice, fewer “this page covers” openers.

### CLI and Reference (ripgrep)

Files under `apps/docs/cli/` and `apps/docs/reference/`.

- Third person or imperative. First sentence defines the command
  the way ripgrep defines `rg`.
- After the definition: install or run block, then tables
  (flags, exits, side effects).
- Cut throat-clearing: “This page is the map…”, “This page
  covers…”, “Use the command pages for…”.
- Link out to Guide when the reader needs *why*. Do not re-pitch
  Adonia on `add` or `check`.
- `--yes` does not prompt. `github:` fails closed. Conflicts do
  not mark `installed`. Keep those facts; say them once, plainly.
- `cli/overview.md` becomes a command index plus shared flags and
  registry order — like ripgrep’s “Documentation quick links”.
- `reference/cli-flags.md` stays a catalog table. One intro
  sentence, then tables.
- `adonia.json` and `module.json`: field tables, required keys,
  examples. No product story.

### Modules (mix)

Files under `apps/docs/modules/`.

- `overview.md`: ripgrep catalog table first; one shadcn sentence
  on “source in the host”, then the table.
- Per-module pages (`api`, `auth`, …):
  1. One-line job (ripgrep).
  2. What `add` copies vs stubs (table).
  3. Contracts / events / env from `module.json` (do not invent).
  4. Link to Guide concepts; do not repeat the manifesto.

## Banned everywhere

- FormWire product names and paths.
- “Beautifully designed”, “powerful”, “seamless”, “batteries
  included”, “just works”.
- Claiming GitHub registries, interactive prompts, or published
  npm behavior that is still Unreleased unless you qualify it.
- Duplicating a full flag table on both `add.md` and
  `cli-flags.md`. `add.md` explains *when*; `cli-flags.md` lists
  *all*.

## Page checklist

Rewrite in this order so Guide can link to a tightened CLI later:

1. `index.md` + `config.mts` `description`
2. `guide/what-is-adonia.md`
3. `guide/concepts.md`
4. `guide/getting-started.md`, `scaffolding.md`, `host-wiring.md`,
   `local-development.md`
5. `cli/overview.md`, then `init`, `add`, `list`, `diff`, `check`
6. `reference/*`
7. `modules/overview.md` + each module page
8. Align `packages/modules/README.md` first paragraph with the
   new home/Guide line (keep the README tables).

Do not expand placeholder-thin pages into essays. If a page is
already long, cut first, then restyle.

## Sources of truth (facts)

Voice can change; these cannot without a CLI change:

- `packages/modules/src/cli.ts` flags
- `apps/adonis-api-stater/modules/*/module.json`
- `apps/adonis-api-stater/modules/registry.json`
- Existing command behavior (`installed` on conflict, `github:`,
  `--with-controllers` implies adapters)

## Verification

- `npm run docs:build` exits 0 (Carbon + markdown).
- Spot-check: home tagline is one line; `what-is-adonia` opens
  with a principle; `cli/add` opens with a definition + commands;
  `reference/cli-flags` is tables.
- Grep the docs tree for “This page covers” / “This page is the
  map” — those phrases should be gone or rare.
- No new FormWire strings.

## Acceptance

1. Three voices are visible without reading this spec.
2. IA unchanged (same sidebar paths).
3. Flag and module facts still match the CLI.
4. Home has no install tutorial.

## Out of scope follow-ups

- `llms.txt` for the docs site.
- Screenshot or GIF on Getting started.
- Translating the repo root README into a full Guide clone.

## Goal

```
Name: Apply three-tone docs voice
Record: proposed
Status: Not started
Timeframe:
Key Results: htmx home; shadcn Guide; ripgrep CLI/reference;
  modules catalog stays factual
Notes: rewrite existing apps/docs copy; no IA or theme change
```

## Tasks

```
Name: Rewrite home hero and site description
Record: proposed
Status: Not started
Parent: Apply three-tone docs voice
```

```
Name: Rewrite Guide in shadcn voice
Record: proposed
Status: Not started
Parent: Apply three-tone docs voice
```

```
Name: Tighten CLI and Reference to ripgrep voice
Record: proposed
Status: Not started
Parent: Apply three-tone docs voice
```

```
Name: Restyle Modules overview and per-module pages
Record: proposed
Status: Not started
Parent: Apply three-tone docs voice
```
