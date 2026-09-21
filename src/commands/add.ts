import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergeModulesConfig } from '../config_merge.js'
import { mergeConstantsCatalogs } from '../constants_merge.js'
import { detectPackageManager, loadHostConfig, writeHostConfig } from '../host.js'
import {
  expandDependencies,
  loadManifest,
  moduleDir,
  resolveRegistry,
  type Registry,
} from '../registry/index.js'
import {
  describePlan,
  executePlan,
  planModuleFiles,
  planStubs,
  planTests,
  type PlannedCopy,
} from '../registry/plan.js'
import type { HostModulesConfig } from '../schema.js'
import type { SharedFlags } from '../types.js'

export interface AddFlags extends SharedFlags {
  skipStubs?: boolean
  withTests?: boolean
}

export async function runAdd(names: string[], flags: AddFlags): Promise<void> {
  if (!names.length) {
    console.error('Usage: adonia add <name…>')
    process.exitCode = 1
    return
  }

  let config: HostModulesConfig
  try {
    config = loadHostConfig(flags.cwd)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  const registry = await resolveRegistry({
    registryFlag: flags.registry,
    hostRegistry: config.registry,
    ref: config.ref,
    cwd: flags.cwd,
  })

  let ordered: string[]
  try {
    ordered = expandDependencies(registry, names, new Set(config.installed), flags.overwrite)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  if (!ordered.length) {
    console.log('Nothing to install (already in adonia.json installed). Use --overwrite to recopy.')
    return
  }

  console.log(`Plan: ${ordered.join(' → ')}`)
  if (!flags.yes && !flags.dryRun) {
    console.log('(continuing; pass --yes to silence)')
  }

  const result = await installModules({ names: ordered, flags, config, registry })
  if (result.conflicts.length) {
    console.error('\nConflicts (use --overwrite to replace):')
    for (const c of result.conflicts) {
      console.error(`  ${describePlan(c, flags.cwd)}`)
    }
    process.exitCode = 1
  }
}

export async function installModules(opts: {
  names: string[]
  flags: AddFlags
  config: HostModulesConfig
  registry: Registry
}): Promise<{ conflicts: PlannedCopy[] }> {
  const { names, flags, registry } = opts
  let config = opts.config
  const allConflicts: PlannedCopy[] = []
  const warnings: string[] = []
  const npmDeps = new Map<string, string>()

  for (const name of names) {
    const manifest = loadManifest(registry, name)
    const plans: PlannedCopy[] = []

    plans.push(...planModuleFiles(registry, name, manifest, config, flags.cwd))

    if (!flags.skipStubs) {
      plans.push(...planStubs(registry, name, manifest, config, flags.cwd, warnings))
    }
    if (flags.withTests) {
      plans.push(...planTests(registry, name, config, flags.cwd))
    }

    if (flags.dryRun) {
      for (const p of plans) {
        console.log(`would process ${describePlan(p, flags.cwd)}`)
      }
    }

    const { results, conflicts } = executePlan(plans, {
      overwrite: flags.overwrite,
      dryRun: flags.dryRun,
    })
    allConflicts.push(...conflicts)

    for (const { plan, result } of results) {
      if (result === 'copied' || result === 'would-copy') {
        console.log(`${result}: ${describePlan(plan, flags.cwd)}`)
      }
    }

    for (const [pkg, version] of Object.entries(manifest.dependencies)) {
      npmDeps.set(pkg, version)
    }

    // Constants merge after core is present: re-merge registry constants into host
    if (name !== 'constants' && !flags.dryRun) {
      const hostConstants = join(flags.cwd, config.paths.modules, 'constants')
      const regConstants = join(moduleDir(registry, 'constants'))
      if (existsSync(hostConstants) && existsSync(regConstants)) {
        warnings.push(...mergeConstantsCatalogs(regConstants, hostConstants, flags.dryRun))
      }
    }

    // Merge config/modules.ts for feature modules with events
    if (manifest.events.length && name !== 'api' && !(['types', 'constants', 'contracts', 'adapters'] as string[]).includes(name)) {
      const configPath = join(flags.cwd, 'config/modules.ts')
      const merged = mergeModulesConfig(
        configPath,
        name,
        manifest.description,
        manifest.events,
        flags.dryRun
      )
      if (!merged.ok) {
        console.warn(`Could not merge config/modules.ts for ${name}. Add manually:\n${merged.snippet}`)
      } else {
        console.log(`${flags.dryRun ? 'Would update' : 'Updated'} config/modules.ts (${name})`)
      }
    }

    // Env hints
    if (manifest.env.length) {
      const missing = missingEnvKeys(flags.cwd, manifest.env)
      if (missing.length) {
        console.log(`Missing env keys for ${name} (not written): ${missing.join(', ')}`)
      }
    }

    if (!flags.dryRun && !config.installed.includes(name)) {
      config = {
        ...config,
        installed: [...config.installed, name],
      }
      writeHostConfig(flags.cwd, config)
    } else if (!flags.dryRun && flags.overwrite && !config.installed.includes(name)) {
      config = { ...config, installed: [...config.installed, name] }
      writeHostConfig(flags.cwd, config)
    }
  }

  // Ensure installed list written even when overwrite of already-installed
  if (!flags.dryRun) {
    writeHostConfig(flags.cwd, config)
  }

  if (npmDeps.size && !flags.dryRun) {
    installNpmDeps(flags.cwd, npmDeps)
  } else if (npmDeps.size && flags.dryRun) {
    console.log(`Would install npm deps: ${[...npmDeps.keys()].join(', ')}`)
  }

  for (const w of warnings) {
    if (w) console.warn(w)
  }

  console.log('\nNext steps (not run by the CLI):')
  console.log('  1. Register routes for new controllers')
  console.log('  2. Run migrations: node ace migration:run')
  console.log('  3. Listen for module events as needed')

  return { conflicts: allConflicts }
}

function missingEnvKeys(cwd: string, keys: string[]): string[] {
  const sources: string[] = []
  for (const f of ['.env', '.env.example', 'start/env.ts']) {
    const p = join(cwd, f)
    if (existsSync(p)) sources.push(readFileSync(p, 'utf8'))
  }
  const blob = sources.join('\n')
  return keys.filter((k) => !blob.includes(k))
}

function installNpmDeps(cwd: string, deps: Map<string, string>): void {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) return
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const have = { ...pkg.dependencies, ...pkg.devDependencies }
  const missing = [...deps.entries()].filter(([name]) => !have[name])
  if (!missing.length) {
    console.log('npm dependencies already satisfied.')
    return
  }
  const pm = detectPackageManager(cwd)
  const specs = missing.map(([name, version]) => `${name}@${version}`)
  console.log(`Installing with ${pm}: ${specs.join(' ')}`)
  const args =
    pm === 'yarn'
      ? ['add', ...specs]
      : pm === 'pnpm'
        ? ['add', ...specs]
        : ['install', ...specs]
  const result = spawnSync(pm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.warn(`Package install exited ${result.status}; install manually: ${specs.join(' ')}`)
  }
}
