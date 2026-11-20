/**
 * Strips HTML from user input before it is stored or shown, for free-form
 * input such as public form submissions or JSON payloads.
 *
 * Uses sanitize-html, which handles malformed tags and encoded entities that
 * a regular expression misses. Every tag is removed; `<script>` and `<style>`
 * are removed with their content.
 */
import sanitizeHtml from 'sanitize-html'

export type SanitizeOptions = {
  /** Each string is cut to this many characters after stripping. Default 10,000. */
  maxStringLength: number
  /**
   * Objects and arrays deeper than this are dropped, not returned as they
   * are, so nothing deep can skip the sanitizer. Default 5.
   */
  maxDepth: number
  /** Most keys kept per object; the rest are dropped. Default 200. */
  maxKeys: number
}

export const defaultSanitizeOptions: SanitizeOptions = {
  maxStringLength: 10_000,
  maxDepth: 5,
  maxKeys: 200,
}

const stripAll: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
}

/** Removes all HTML, trims, and cuts to `maxStringLength`. */
export function sanitizeString(
  value: string,
  options: Pick<SanitizeOptions, 'maxStringLength'> = defaultSanitizeOptions
): string {
  return sanitizeHtml(value, stripAll).trim().slice(0, options.maxStringLength)
}

/**
 * Sanitizes every string in a JSON-like value: object keys and values,
 * arrays at any position. Numbers, booleans and null are kept. Anything
 * else (functions, symbols, class instances other than plain data) becomes
 * null. Values past `maxDepth` are dropped.
 */
export function sanitizeValue(value: unknown, options: Partial<SanitizeOptions> = {}): unknown {
  return clean(value, { ...defaultSanitizeOptions, ...options }, 0)
}

/** `sanitizeValue` for an object, typed as one. */
export function sanitizeObject(
  data: Record<string, unknown>,
  options: Partial<SanitizeOptions> = {}
): Record<string, unknown> {
  const result = sanitizeValue(data, options)
  return result && typeof result === 'object' && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : {}
}

const DROP = Symbol('drop')

function clean(value: unknown, options: SanitizeOptions, depth: number): unknown {
  if (typeof value === 'string') return sanitizeString(value, options)
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    if (depth >= options.maxDepth) return DROP
    return value
      .slice(0, options.maxKeys)
      .map((item) => clean(item, options, depth + 1))
      .filter((item) => item !== DROP)
  }

  if (typeof value === 'object') {
    if (depth >= options.maxDepth) return DROP
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value).slice(0, options.maxKeys)) {
      const cleanKey = sanitizeString(key, { maxStringLength: 200 })
      if (!cleanKey || cleanKey === '__proto__') continue
      const cleaned = clean(item, options, depth + 1)
      if (cleaned !== DROP) result[cleanKey] = cleaned
    }
    return result
  }

  return null
}
