import { defaultHostConfig, isAdonisApp, loadHostConfig, writeHostConfig } from '../host.js'
import { expandDependencies, resolveRegistry } from '../registry/index.js'
import { CORE_PACKAGES } from '../schema.js'
import type { SharedFlags } from '../types.js'
import { applyWire, printWireChecklist } from '../wire.js'
import { installModules } from './add.js'

export async function runInit(
  flags: SharedFlags & { wire?: boolean; skipCore?: boolean; scaffold?: boolean }
): Promise<void> {
  const cwd = flags.cwd
  const check = isAdonisApp(cwd)
  if (!check.ok) {
    console.error(check.reason)
    process.exitCode = 1
    return
  }

  let wire = Boolean(flags.wire)
  if (flags.scaffold && !wire) {
    console.log('Scaffold implies --wire; enabling host wiring.')
    wire = true
  }

  let config = defaultHostConfig()
  try {
    config = loadHostConfig(cwd)
    console.log('adonia.json already exists; keeping current config.')
  } catch {
    writeHostConfig(cwd, config, flags.dryRun)
    console.log(flags.dryRun ? 'Would write adonia.json' : 'Wrote adonia.json')
  }

  if (wire) {
    const actions = applyWire(cwd, flags.dryRun)
    if (actions.length) {
      console.log(`${flags.dryRun ? 'Would wire' : 'Wired'}: ${actions.join(', ')}`)
    } else {
      console.log('Host wiring already up to date.')
    }
  } else {
    printWireChecklist()
  }

  let registry
  try {
    registry = await resolveRegistry({
      registryFlag: flags.registry,
      hostRegistry: config.registry,
      ref: config.ref,
      cwd,
    })
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  if (!flags.dryRun) {
    try {
      config = loadHostConfig(cwd)
    } catch {
      /* keep in-memory default */
    }
  }

  if (flags.skipCore) {
    console.log('Skipping core install (--skip-core).')
  } else {
    if (!flags.yes && !flags.dryRun) {
      console.log('Install shared API core into ./modules? (yes)')
    }

    const coreNames = ['api', ...CORE_PACKAGES]
    const toInstall = expandDependencies(
      registry,
      coreNames,
      new Set(config.installed),
      flags.overwrite
    )

    if (!toInstall.length) {
      console.log('Core already installed.')
    } else {
      const result = await installModules({
        names: toInstall,
        flags: { ...flags, yes: true, withTests: false, suppressNextSteps: true },
        config,
        registry,
      })
      if (result.conflicts.length || result.wireErrors.length) {
        process.exitCode = 1
      }
      if (!flags.dryRun) {
        try {
          config = loadHostConfig(cwd)
        } catch {
          /* keep */
        }
      }
    }
  }

  if (!flags.scaffold) return

  const featureNames = registry.index.modules
  if (!featureNames.length) {
    console.log('No feature modules in registry to scaffold.')
    return
  }

  console.log(`Scaffolding feature modules: ${featureNames.join(', ')}`)
  const ordered = expandDependencies(
    registry,
    featureNames,
    new Set(config.installed),
    flags.overwrite
  )

  if (!ordered.length) {
    console.log('Feature modules already installed. Use --overwrite to recopy stubs/routes.')
    // Still attempt route wiring for already-installed modules when route files exist
    return
  }

  const result = await installModules({
    names: ordered,
    flags: {
      ...flags,
      yes: true,
      withStubs: true,
      withRoutes: true,
      wireRoutes: true,
      withTests: false,
    },
    config,
    registry,
  })

  if (result.conflicts.length || result.wireErrors.length) {
    process.exitCode = 1
  }
}
