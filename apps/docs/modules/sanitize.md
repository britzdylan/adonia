# sanitize

`sanitize` strips HTML from user input, from one string up to a whole
nested JSON payload.

| Field | Value |
|-------|-------|
| Depends on | `api` |
| npm | `sanitize-html@^2.18.2` (add `@types/sanitize-html` as a dev dependency) |
| Env | none |
| Events | none |

## Add it

```bash
npx adonia add sanitize
npm install -D @types/sanitize-html
```

## What you get

| Path | Role |
|------|------|
| `sanitize.ts` | `sanitizeString`, `sanitizeValue`, `sanitizeObject` |
| `module.json` | Manifest |

## Use it

```ts
import { sanitizeObject, sanitizeString } from '#modules/sanitize/sanitize'

const name = sanitizeString(input.name) // '<b>Ada</b> ' → 'Ada'
const answers = sanitizeObject(request.body())
```

| Input | Result |
|-------|--------|
| String | All tags removed (`<script>` and `<style>` with their content), trimmed, cut to `maxStringLength` |
| Object key | Sanitized like a string; `__proto__` is dropped |
| Array, object | Sanitized at every position, nested arrays included |
| Number, boolean, null | Kept |
| `Date` | ISO string |
| Function, undefined, other | `null` |
| Deeper than `maxDepth` | Dropped |

Options (second argument):

| Option | Default |
|--------|---------|
| `maxStringLength` | 10,000 |
| `maxDepth` | 5 |
| `maxKeys` (per object or array) | 200 |

Values past `maxDepth` are dropped, not returned as they are, so
nothing deep can skip the sanitizer.

Sanitize text you store and show again. Do not sanitize passwords or
tokens: compare those as the user sent them.
