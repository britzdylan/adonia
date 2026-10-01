#!/usr/bin/env node
/**
 * Bump every workspace package to one version, write CHANGELOG.md,
 * commit, and create an annotated tag. Does not push.
 *
 *   npm run release -- patch
 *   npm run release -- minor
 *   npm run release -- major
 *   npm run release -- 0.2.0
 *   npm run release -- patch --dry-run
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const changelogPath = join(root, 'CHANGELOG.md')

const SKIP_TYPES = new Set(['chore', 'test', 'ci', 'build'])
const GROUPS = [
  { title: 'Breaking', test: (commit) => commit.breaking },
  { title: 'Added', test: (commit) => !commit.breaking && commit.type === 'feat' },
  { title: 'Fixed', test: (commit) => !commit.breaking && commit.type === 'fix' },
  {
    title: 'Changed',
    test: (commit) => !commit.breaking && ['refactor', 'perf', 'style', 'revert'].includes(commit.type),
  },
  { title: 'Documentation', test: (commit) => !commit.breaking && commit.type === 'docs' },
]

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const dryRun = args.includes('--dry-run')
const bumpArg = args.find((arg) => !arg.startsWith('--'))

if (!bumpArg || args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run release -- <patch|minor|major|x.y.z> [--dry-run]`)
  process.exit(bumpArg ? 0 : 1)
}

const current = readJson(join(root, 'package.json')).version
if (!isSemver(current)) {
  fail(`Root package.json version is not semver: ${current}`)
}

const next = resolveVersion(current, bumpArg)
if (compareSemver(next, current) <= 0) {
  fail(`Next version ${next} must be greater than ${current}`)
}

const tag = `v${next}`
if (tagExists(tag)) {
  fail(`Tag ${tag} already exists`)
}

const dirty = git(['status', '--porcelain'])
if (dirty && !dryRun) {
  fail('Working tree is dirty. Commit or stash changes before releasing.')
}

const manifests = workspaceManifests()
const commits = commitsSinceLastTag()
const changelog = readFileSync(changelogPath, 'utf8')
const versionBody = mergeNotes(extractUnreleased(changelog), commits)

if (!versionBody.trim()) {
  fail(`No changelog notes since ${lastTag() ?? 'the start of history'}`)
}

const date = new Date().toISOString().slice(0, 10)
const versionSection = `## ${next} (${date})\n\n${versionBody.trim()}\n`
const nextChangelog = replaceUnreleased(changelog, versionSection)

console.log(`Release ${current} → ${next}`)
console.log(`Manifests:`)
for (const file of manifests) console.log(`  ${file.slice(root.length + 1)}`)
console.log('')
console.log(versionSection.trimEnd())
console.log('')
console.log(`Commit: chore: release ${tag}`)
console.log(`Tag:    ${tag}`)

if (dryRun) {
  if (dirty) console.log('\nDry run only. Working tree is dirty; a real release would stop.')
  else console.log('\nDry run only. No files written.')
  process.exit(0)
}

for (const file of manifests) {
  const text = readFileSync(file, 'utf8')
  writeFileSync(file, setVersion(text, next))
}
writeFileSync(changelogPath, nextChangelog)

git(['add', '--', ...manifests, changelogPath], { stdio: 'inherit' })
git(['commit', '-m', `chore: release ${tag}`], { stdio: 'inherit' })
git(['tag', '-a', tag, '-m', tag], { stdio: 'inherit' })

console.log(`\nTagged ${tag}. Push with: git push origin HEAD --follow-tags`)

function workspaceManifests() {
  const files = [join(root, 'package.json')]
  for (const dir of ['apps', 'packages']) {
    const abs = join(root, dir)
    if (!existsSync(abs)) continue
    for (const name of readdirSync(abs)) {
      const file = join(abs, name, 'package.json')
      if (existsSync(file)) files.push(file)
    }
  }
  return files
}

function resolveVersion(currentVersion, arg) {
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  if (arg === 'patch') return `${major}.${minor}.${patch + 1}`
  if (arg === 'minor') return `${major}.${minor + 1}.0`
  if (arg === 'major') return `${major + 1}.0.0`
  if (isSemver(arg)) return arg
  fail(`Expected patch, minor, major, or x.y.z. Got: ${arg}`)
}

function commitsSinceLastTag() {
  const tagName = lastTag()
  const range = tagName ? `${tagName}..HEAD` : 'HEAD'
  const raw = git(['log', range, '--no-merges', '--pretty=format:%s%x1f%b%x1e'])
  if (!raw) return []

  return raw
    .split('\x1e')
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseCommit)
    .filter((commit) => {
      if (!commit) return false
      if (/^release v\d/i.test(commit.description)) return false
      if (commit.breaking) return true
      return !SKIP_TYPES.has(commit.type)
    })
}

function parseCommit(block) {
  const [subject = '', body = ''] = block.split('\x1f')
  const match = subject.match(/^(\w+)(?:\([^)]+\))?(!)?:\s+(.+)$/)
  if (!match) return null
  const type = match[1].toLowerCase()
  const breaking = Boolean(match[2]) || /^breaking change:/im.test(body)
  return { type, breaking, description: match[3].trim(), body }
}

function mergeNotes(unreleased, list) {
  const sections = new Map()
  const order = []

  function addSection(title, body) {
    if (!sections.has(title)) {
      sections.set(title, [])
      order.push(title)
    }
    if (body.trim()) sections.get(title).push(body.trim())
  }

  if (unreleased) {
    const chunks = unreleased.split(/^### /m).filter((chunk) => chunk.trim())
    const preamble = unreleased.startsWith('### ') ? '' : chunks.shift()?.trim() ?? ''
    if (preamble) addSection('', preamble)
    for (const chunk of chunks) {
      const [titleLine, ...rest] = chunk.split('\n')
      addSection(titleLine.trim(), rest.join('\n'))
    }
  }

  for (const group of GROUPS) {
    const items = list.filter(group.test)
    if (items.length === 0) continue
    addSection(group.title, items.map((item) => wrapBullet(item.description)).join('\n'))
  }

  return order
    .map((title) => {
      const parts = sections.get(title)
      const body = parts.every((part) => part.startsWith('- ')) ? parts.join('\n') : parts.join('\n\n')
      return title ? `### ${title}\n\n${body}` : body
    })
    .join('\n\n')
}

function extractUnreleased(markdown) {
  const match = markdown.match(/^## Unreleased\s*\n([\s\S]*?)(?=^## )/m)
  if (!match) return ''
  const body = match[1].trim()
  if (!/^[-*] /m.test(body)) return ''
  return body
}

function replaceUnreleased(markdown, section) {
  const replacement = `## Unreleased\n\n${section}\n`
  if (/^## Unreleased\s*\n[\s\S]*?(?=^## )/m.test(markdown)) {
    return markdown.replace(/^## Unreleased\s*\n[\s\S]*?(?=^## )/m, replacement)
  }
  if (markdown.startsWith('# Changelog')) {
    return markdown.replace(/^(# Changelog\s*\n)/, `$1\n${replacement}`)
  }
  return `${replacement}${markdown}`
}

function wrapBullet(text) {
  const words = text.split(/\s+/)
  const lines = []
  let line = '-'
  for (const word of words) {
    const candidate = `${line} ${word}`
    if (candidate.length > 80 && line !== '-') {
      lines.push(line)
      line = `  ${word}`
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines.join('\n')
}

function setVersion(text, version) {
  let replaced = false
  const nextText = text.replace(/"version": "[^"]+"/, (found) => {
    if (replaced) return found
    replaced = true
    return `"version": "${version}"`
  })
  if (!replaced) fail(`No "version" field in a workspace manifest`)
  return nextText
}

function lastTag() {
  try {
    return git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'])
  } catch {
    return null
  }
}

function tagExists(name) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/tags/${name}`])
    return true
  } catch {
    return false
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+$/.test(value)
}

function compareSemver(left, right) {
  const a = left.split('.').map(Number)
  const b = right.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

function git(gitArgs, options = {}) {
  const result = execFileSync('git', gitArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  })
  return typeof result === 'string' ? result.trim() : ''
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
