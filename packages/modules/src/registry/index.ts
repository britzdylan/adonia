import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CORE_PACKAGES,
  impliedCoreManifest,
  moduleManifestSchema,
  registryIndexSchema,
  type ModuleManifest,
  type RegistryIndex,
} from '../schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface Registry {
  root: string
  index: RegistryIndex
  source: 'flag' | 'bundled'
}

export function bundledRegistryPath(): string {
  // build/registry/index.js → ../../registry
  return resolve(__dirname, '../../registry')
}

export function loadRegistryIndex(root: string): RegistryIndex {
  const path = join(root, 'registry.json')
  if (!existsSync(path)) {
    const names = readdirSync(root).filter((n) => {
      try {
        return statSync(join(root, n)).isDirectory()
      } catch {
        return false
      }
    })
    const core = ['api', ...CORE_PACKAGES].filter((n) => names.includes(n))
    const modules = names.filter(
      (n) => !core.includes(n) && existsSync(join(root, n, 'module.json'))
    )
    return registryIndexSchema.parse({ core, modules })
  }
  return registryIndexSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

/**
 * Resolution order:
 * 1. --registry <dir>
 * 2. bundled (adonia.json "bundled" or empty)
 * 3. local path in adonia.json
 * github:… is rejected until remote materialization lands.
 */
export async function resolveRegistry(options: {
  registryFlag?: string
  hostRegistry?: string
  ref?: string
  cwd: string
}): Promise<Registry> {
  if (options.registryFlag) {
    const root = resolve(options.cwd, options.registryFlag)
    if (!existsSync(root)) {
      throw new Error(`Registry path not found: ${root}`)
    }
    return { root, index: loadRegistryIndex(root), source: 'flag' }
  }

  const hostReg = options.hostRegistry ?? 'bundled'
  if (hostReg === 'bundled' || hostReg === '') {
    return loadBundled()
  }

  if (hostReg.startsWith('github:')) {
    throw new Error(
      'GitHub registries (github:…) are not supported in adonia@0.1.x.\n' +
        'Use "registry": "bundled", a local path in adonia.json, or\n' +
        '--registry <dir>.'
    )
  }

  // Treat other strings as local paths relative to cwd
  const asPath = resolve(options.cwd, hostReg)
  if (existsSync(asPath)) {
    return { root: asPath, index: loadRegistryIndex(asPath), source: 'flag' }
  }

  console.warn(`Unknown registry "${hostReg}"; using bundled.`)
  return loadBundled()
}

function loadBundled(): Registry {
  const bundled = bundledRegistryPath()
  if (!existsSync(bundled)) {
    throw new Error(
      `Bundled registry missing at ${bundled}. Reinstall adonia or pass --registry <dir>.`
    )
  }
  return { root: bundled, index: loadRegistryIndex(bundled), source: 'bundled' }
}

export function loadManifest(registry: Registry, name: string): ModuleManifest {
  if ((CORE_PACKAGES as readonly string[]).includes(name)) {
    return impliedCoreManifest(name as (typeof CORE_PACKAGES)[number])
  }
  const path = join(registry.root, name, 'module.json')
  if (!existsSync(path)) {
    throw new Error(`Unknown module "${name}". Run \`npx adonia list\` to see available modules.`)
  }
  return moduleManifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

export function expandDependencies(
  registry: Registry,
  names: string[],
  installed: Set<string>,
  overwrite: boolean
): string[] {
  const ordered: string[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(name: string): void {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      throw new Error(`Cycle in registryDependencies involving "${name}"`)
    }
    visiting.add(name)
    const manifest = loadManifest(registry, name)
    for (const dep of manifest.registryDependencies) {
      visit(dep)
    }
    if (name === 'api') {
      for (const core of CORE_PACKAGES) {
        visit(core)
      }
    }
    visiting.delete(name)
    visited.add(name)
    if (!installed.has(name) || overwrite) {
      if (!ordered.includes(name)) ordered.push(name)
    }
  }

  for (const name of names) {
    visit(name)
  }
  return ordered
}

export function listAllModuleNames(registry: Registry): string[] {
  return [...registry.index.core, ...registry.index.modules]
}

export function moduleDir(registry: Registry, name: string): string {
  return join(registry.root, name)
}

export function relativeFromRegistry(registry: Registry, absPath: string): string {
  return relative(registry.root, absPath)
}
