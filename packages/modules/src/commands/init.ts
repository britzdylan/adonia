import { defaultHostConfig, isAdonisApp, loadHostConfig, writeHostConfig } from '../host.js'
import { expandDependencies, resolveRegistry } from '../registry/index.js'
import { CORE_PACKAGES } from '../schema.js'
import type { SharedFlags } from '../types.js'
import { applyWire, printWireChecklist } from '../wire.js'
import { installModules } from './add.js'

export async function runInit(
  flags: SharedFlags & { wire?: boolean; skipCore?: boolean }
): Promise<void> {
  const cwd = flags.cwd
  const check = isAdonisApp(cwd)
  if (!check.ok) {
    console.error(check.reason)
    process.exitCode = 1
    return
  }

  let config = defaultHostConfig()
  let wroteConfig = false
  try {
    config = loadHostConfig(cwd)
    console.log('adonia.json already exists; keeping current config.')
  } catch {
    writeHostConfig(cwd, config, flags.dryRun)
    wroteConfig = true
    console.log(flags.dryRun ? 'Would write adonia.json' : 'Wrote adonia.json')
  }

  if (flags.wire) {
    const actions = applyWire(cwd, flags.dryRun)
    if (actions.length) {
      console.log(`${flags.dryRun ? 'Would wire' : 'Wired'}: ${actions.join(', ')}`)
    } else {
      console.log('Host wiring already up to date.')
    }
  } else {
    printWireChecklist()
  }

  if (flags.skipCore) {
    console.log('Skipping core install (--skip-core).')
    if (wroteConfig) return
    return
  }

  // Prompt default yes; --yes skips prompt
  if (!flags.yes && !flags.dryRun) {
    console.log('Install shared API core into ./modules? (yes)')
  }

  const registry = await resolveRegistry({
    registryFlag: flags.registry,
    hostRegistry: config.registry,
    ref: config.ref,
    cwd,
  })

  const coreNames = ['api', ...CORE_PACKAGES]
  const toInstall = expandDependencies(
    registry,
    coreNames,
    new Set(config.installed),
    flags.overwrite
  )

  if (!toInstall.length) {
    console.log('Core already installed.')
    return
  }

  const result = await installModules({
    names: toInstall,
    flags: { ...flags, yes: true, skipStubs: true, withTests: false },
    config,
    registry,
  })

  if (result.conflicts.length) {
    process.exitCode = 1
  }
}
