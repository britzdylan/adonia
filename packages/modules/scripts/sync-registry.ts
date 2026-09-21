#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const monorepoRoot = resolve(pkgRoot, '../..')
const source = join(monorepoRoot, 'apps/adonis-api-stater/modules')
const dest = join(pkgRoot, 'registry')

if (!existsSync(source)) {
  console.error(`Registry source missing: ${source}`)
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(source, dest, { recursive: true })
console.log(`Synced registry → ${dest}`)
