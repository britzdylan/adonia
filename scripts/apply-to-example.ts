#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'build/cli.js')
const example = join(root, 'examples/api')
const registry = join(root, 'registry')

if (!existsSync(cli)) {
  console.error('Missing build/cli.js — run npm run build first')
  process.exit(1)
}
if (!existsSync(example)) {
  console.error('Missing examples/api')
  process.exit(1)
}

function run(args: string[]): void {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const index = JSON.parse(readFileSync(join(registry, 'registry.json'), 'utf8')) as {
  core: string[]
  modules: string[]
}
const names = [...index.modules]

run(['init', '--wire', '--yes', '--cwd', example, '--registry', registry])
if (names.length) {
  run(['add', ...names, '--overwrite', '--yes', '--cwd', example, '--registry', registry])
}
console.log('Applied registry → examples/api')
