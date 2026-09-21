import { loadHostConfig } from '../host.js'
import { listAllModuleNames, loadManifest, resolveRegistry } from '../registry/index.js'
import type { SharedFlags } from '../types.js'

export async function runList(flags: SharedFlags): Promise<void> {
  let installed = new Set<string>()
  let hostRegistry: string | undefined
  let ref: string | undefined
  try {
    const config = loadHostConfig(flags.cwd)
    installed = new Set(config.installed)
    hostRegistry = config.registry
    ref = config.ref
  } catch {
    console.log('(no adonia.json — showing registry only; run npx adonia init)')
  }

  const registry = await resolveRegistry({
    registryFlag: flags.registry,
    hostRegistry,
    ref,
    cwd: flags.cwd,
  })

  console.log(`Registry (${registry.source}): ${registry.root}\n`)
  for (const name of listAllModuleNames(registry)) {
    let description = ''
    try {
      description = loadManifest(registry, name).description
    } catch {
      description = ''
    }
    const mark = installed.has(name) ? 'installed' : 'available'
    console.log(`  ${name.padEnd(16)} [${mark}]  ${description}`)
  }
}
