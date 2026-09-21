import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CATALOG_FILES = ['exceptions.ts', 'responseCodes.ts'] as const

/**
 * Merge registry constant catalogs into the host copy without deleting host keys.
 */
export function mergeConstantsCatalogs(
  registryConstantsDir: string,
  hostConstantsDir: string,
  dryRun = false
): string[] {
  const warnings: string[] = []
  for (const file of CATALOG_FILES) {
    const src = join(registryConstantsDir, file)
    const dest = join(hostConstantsDir, file)
    if (!existsSync(src) || !existsSync(dest)) continue
    const result = mergeOneCatalog(src, dest, dryRun)
    if (result) warnings.push(result)
  }
  return warnings
}

function mergeOneCatalog(src: string, dest: string, dryRun: boolean): string | null {
  const registryText = readFileSync(src, 'utf8')
  const hostText = readFileSync(dest, 'utf8')
  const regEntries = parseCatalogEntries(registryText)
  const hostEntries = parseCatalogEntries(hostText)
  if (!regEntries || !hostEntries) {
    return `Could not parse ${dest} for constants merge; copy keys from the registry by hand.`
  }

  let inserted = 0
  const conflicts: string[] = []
  const hostKeys = new Set(Object.keys(hostEntries.map))
  let nextBody = hostEntries.body

  for (const [key, value] of Object.entries(regEntries.map)) {
    if (!hostKeys.has(key)) {
      // insert before closing brace of object
      const insert = `  ${key}: ${value},\n`
      nextBody = nextBody.replace(/\n\}\s*$/, `\n${insert}}`)
      inserted++
      continue
    }
    if (normalizeEntry(hostEntries.map[key]!) !== normalizeEntry(value)) {
      conflicts.push(key)
    }
  }

  if (inserted && !dryRun) {
    writeFileSync(dest, hostText.slice(0, hostEntries.start) + nextBody + hostText.slice(hostEntries.end))
  }
  if (conflicts.length) {
    return `Constants conflict in ${dest}: ${conflicts.join(', ')}`
  }
  return null
}

function normalizeEntry(s: string): string {
  return s.replace(/\s+/g, '')
}

function parseCatalogEntries(
  text: string
): { map: Record<string, string>; body: string; start: number; end: number } | null {
  // Find first `= {` after export/const
  const m = text.match(/=\s*\{/)
  if (!m || m.index === undefined) return null
  const open = m.index + m[0].length - 1
  let depth = 0
  let end = -1
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end === -1) return null
  const body = text.slice(open, end)
  const map: Record<string, string> = {}
  // Match KEY: { ... }, at top level
  const entryRe = /(\w+)\s*:\s*(\{[^}]*\})/g
  let match: RegExpExecArray | null
  while ((match = entryRe.exec(body))) {
    map[match[1]!] = match[2]!
  }
  return { map, body, start: open, end }
}
