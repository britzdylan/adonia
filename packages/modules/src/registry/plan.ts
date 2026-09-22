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

/** App stub folders selected by CLI flags. Routes are never included in `--with-stubs`. */
export type StubFolder = 'models' | 'migrations' | 'controllers' | 'validators' | 'routes'

export interface StubSelect {
  models: boolean
  migrations: boolean
  controllers: boolean
  validators: boolean
  routes: boolean
}

const APP_STUB_FOLDERS: StubFolder[] = ['models', 'migrations', 'controllers', 'validators']

const STUB_FOLDER_TO_PATH_KEY: Record<
  Exclude<StubFolder, 'routes'>,
  keyof HostModulesConfig['paths']
> = {
  models: 'models',
  migrations: 'migrations',
  controllers: 'controllers',
  validators: 'validators',
}

export const DEFAULT_ROUTES_DIR = 'start/routes'

export function resolveStubSelect(flags: {
  withStubs?: boolean
  withModels?: boolean
  withMigrations?: boolean
  withControllers?: boolean
  withValidators?: boolean
  withRoutes?: boolean
}): StubSelect | null {
  const select: StubSelect = {
    models: Boolean(flags.withStubs || flags.withModels),
    migrations: Boolean(flags.withStubs || flags.withMigrations),
    controllers: Boolean(flags.withStubs || flags.withControllers),
    validators: Boolean(flags.withStubs || flags.withValidators),
    routes: Boolean(flags.withRoutes),
  }
  if (!APP_STUB_FOLDERS.some((f) => select[f]) && !select.routes) return null
  return select
}

export function anyAppStubsSelected(select: StubSelect | null): boolean {
  if (!select) return false
  return APP_STUB_FOLDERS.some((f) => select[f])
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
  warnings: string[],
  select: StubSelect
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
    const folder = without.slice(0, slash) as StubFolder
    const rest = without.slice(slash + 1)
    if (!select[folder]) continue

    if (folder === 'routes') {
      plans.push({
        src: join(root, rel),
        dest: join(cwd, DEFAULT_ROUTES_DIR, rest),
        kind: 'stub',
      })
      continue
    }

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

export function manifestHasRouteStubs(manifest: ModuleManifest): boolean {
  return manifest.stubs.some((s) => /(^|\/)stubs\/routes(\/|$)/.test(s) || s.includes('stubs/routes'))
}

export function hostRouteFile(cwd: string, moduleName: string): string {
  return join(cwd, DEFAULT_ROUTES_DIR, `${moduleName}.ts`)
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
