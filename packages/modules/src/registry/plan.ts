import fg from 'fast-glob'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { copyFileWithPolicy, type CopyOptions, type CopyResult } from '../copy.js'
import type { HostModulesConfig, ModuleManifest } from '../schema.js'
import type { Registry } from './index.js'
import { moduleDir } from './index.js'

export interface PlannedCopy {
  src: string
  dest: string
  kind: 'file' | 'stub' | 'test'
}

const STUB_FOLDER_TO_PATH_KEY: Record<string, keyof HostModulesConfig['paths']> = {
  models: 'models',
  migrations: 'migrations',
  controllers: 'controllers',
  validators: 'validators',
}

export function planModuleFiles(
  registry: Registry,
  name: string,
  manifest: ModuleManifest,
  host: HostModulesConfig,
  cwd: string
): PlannedCopy[] {
  const root = moduleDir(registry, name)
  const destRoot = join(cwd, host.paths.modules, name)
  const files = fg.sync(manifest.files.length ? manifest.files : ['**/*'], {
    cwd: root,
    onlyFiles: true,
    dot: false,
    ignore: ['stubs/**', 'tests/**', 'node_modules/**'],
  })
  return files.map((rel) => ({
    src: join(root, rel),
    dest: join(destRoot, rel),
    kind: 'file' as const,
  }))
}

export function planStubs(
  registry: Registry,
  name: string,
  manifest: ModuleManifest,
  host: HostModulesConfig,
  cwd: string,
  warnings: string[]
): PlannedCopy[] {
  const root = moduleDir(registry, name)
  const plans: PlannedCopy[] = []
  const stubGlobs = manifest.stubs.length ? manifest.stubs : []
  const files = fg.sync(stubGlobs, { cwd: root, onlyFiles: true })
  for (const rel of files) {
    // stubs/models/foo.ts
    const without = rel.replace(/^stubs\//, '')
    const slash = without.indexOf('/')
    if (slash === -1) {
      warnings.push(`Skipping stub with no folder: ${rel}`)
      continue
    }
    const folder = without.slice(0, slash)
    const rest = without.slice(slash + 1)
    const pathKey = STUB_FOLDER_TO_PATH_KEY[folder]
    if (!pathKey) {
      warnings.push(`Unknown stub folder "${folder}" (${rel}); skipped`)
      continue
    }
    const destDir = host.paths[pathKey] as string
    plans.push({
      src: join(root, rel),
      dest: join(cwd, destDir, rest),
      kind: 'stub',
    })
  }
  return plans
}

export function planTests(
  registry: Registry,
  name: string,
  host: HostModulesConfig,
  cwd: string
): PlannedCopy[] {
  const root = join(moduleDir(registry, name), 'tests')
  if (!existsSync(root)) return []
  const files = fg.sync('**/*', { cwd: root, onlyFiles: true })
  const destRoot = join(cwd, host.paths.modules, name, 'tests')
  return files.map((rel) => ({
    src: join(root, rel),
    dest: join(destRoot, rel),
    kind: 'test' as const,
  }))
}

export function executePlan(
  plans: PlannedCopy[],
  options: CopyOptions
): { results: { plan: PlannedCopy; result: CopyResult }[]; conflicts: PlannedCopy[] } {
  const results: { plan: PlannedCopy; result: CopyResult }[] = []
  const conflicts: PlannedCopy[] = []
  for (const plan of plans) {
    const result = copyFileWithPolicy(plan.src, plan.dest, options)
    results.push({ plan, result })
    if (result === 'conflict' || result === 'would-conflict') {
      conflicts.push(plan)
    }
  }
  return { results, conflicts }
}

export function describePlan(plan: PlannedCopy, cwd: string): string {
  return `${plan.kind}: ${relative(cwd, plan.dest)}`
}
