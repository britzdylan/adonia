import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * Insert or replace a single module key in config/modules.ts.
 * Uses a lightweight text approach so we don't need a TS parser.
 */
export function mergeModulesConfig(
  path: string,
  name: string,
  description: string,
  events: string[],
  dryRun = false
): { ok: true } | { ok: false; snippet: string } {
  const entry = buildEntry(name, description, events)

  if (!existsSync(path)) {
    const content = `const modulesConfig: Record<string, { description: string; emits: string[] }> = {\n${entry}\n}\n\nexport default modulesConfig\n`
    if (!dryRun) writeFileSync(path, content)
    return { ok: true }
  }

  const original = readFileSync(path, 'utf8')
  if (!/modulesConfig\s*[:=]/.test(original) && !/export\s+default/.test(original)) {
    return { ok: false, snippet: entry }
  }

  // Replace existing key block or insert before closing brace of the object
  const keyRe = new RegExp(
    `(^|\\n)\\s*${escapeRegExp(name)}\\s*:\\s*\\{[\\s\\S]*?\\n\\s*\\},?`,
    'm'
  )

  let next: string
  if (keyRe.test(original)) {
    next = original.replace(keyRe, `$1${entry}`)
  } else {
    // Find the modulesConfig object closing
    const openMatch = original.match(
      /((?:const|let|var)\s+modulesConfig[^=]*=\s*\{|modulesConfig\s*[:=]\s*\{)/
    )
    if (!openMatch || openMatch.index === undefined) {
      return { ok: false, snippet: entry }
    }
    const start = openMatch.index + openMatch[0].length
    const close = findMatchingBrace(original, start - 1)
    if (close === -1) return { ok: false, snippet: entry }
    const before = original.slice(0, close)
    const after = original.slice(close)
    const needsComma = /[^\s,{]$/.test(before.trimEnd()) || /emits:\s*\[[^\]]*\]\s*$/.test(before)
    const trimmed = before.replace(/\s*$/, '')
    const comma = trimmed.endsWith(',') || trimmed.endsWith('{') ? '' : ','
    next = `${trimmed}${comma}\n${entry}\n${after}`
    void needsComma
  }

  if (!dryRun) writeFileSync(path, next)
  return { ok: true }
}

function buildEntry(name: string, description: string, events: string[]): string {
  const emits = events.map((e) => `    '${e}',`).join('\n')
  return `  ${name}: {
    description: ${JSON.stringify(description)},
    emits: [
${emits}
    ],
  },`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}
