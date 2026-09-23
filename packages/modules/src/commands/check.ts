import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatMissingPeer, missingAdonisPeers } from '../adonis_peers.js'
import { loadHostConfig } from '../host.js'
import { loadManifest, resolveRegistry } from '../registry/index.js'
import { CORE_PACKAGES } from '../schema.js'
import { REQUIRED_IMPORTS } from '../wire.js'
import type { SharedFlags } from '../types.js'

// Reserved manifest fields (not checked yet): hostTests, hostFacingExceptions.

export async function runCheck(flags: SharedFlags & { strict?: boolean }): Promise<void> {
  let config
  try {
    config = loadHostConfig(flags.cwd)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  const errors: string[] = []
  const warnings: string[] = []
  const installed = new Set(config.installed)

  for (const [key, rel] of Object.entries(config.paths)) {
    const p = join(flags.cwd, rel as string)
    if (!existsSync(p)) {
      // paths may not exist until first add — warn for empty dirs
      warnings.push(`path.${key} missing: ${rel}`)
    }
  }

  let registry
  try {
    registry = await resolveRegistry({
      registryFlag: flags.registry,
      hostRegistry: config.registry,
      ref: config.ref,
      cwd: flags.cwd,
    })
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  for (const name of config.installed) {
    const folder = join(flags.cwd, config.paths.modules, name)
    if (!existsSync(folder)) {
      errors.push(`installed module folder missing: ${folder}`)
      continue
    }
    const manifestPath = join(folder, 'module.json')
    if (existsSync(manifestPath)) {
      try {
        const local = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string }
        if (local.name && local.name !== name) {
          errors.push(`module.json name mismatch in ${name}: ${local.name}`)
        }
      } catch {
        warnings.push(`could not parse ${manifestPath}`)
      }
    }

    try {
      const manifest = loadManifest(registry, name)

      const requiredDeps = [...manifest.registryDependencies]
      if (name === 'api') {
        for (const core of CORE_PACKAGES) {
          if (!requiredDeps.includes(core)) requiredDeps.push(core)
        }
      }
      for (const dep of requiredDeps) {
        if (!installed.has(dep)) {
          errors.push(
            `installed module "${name}" requires "${dep}" (not in adonia.json installed)`
          )
        }
      }

      for (const peer of manifest.peerModels) {
        const file = peerModelToPath(peer, config.paths.models, flags.cwd)
        if (!existsSync(file)) {
          errors.push(`peerModel missing: ${peer} → ${file}`)
        }
      }

      if (manifest.events.length) {
        const configPath = join(flags.cwd, 'config/modules.ts')
        if (!existsSync(configPath)) {
          warnings.push(`config/modules.ts missing (events for ${name})`)
        } else {
          const text = readFileSync(configPath, 'utf8')
          for (const ev of manifest.events) {
            if (!text.includes(ev)) {
              warnings.push(`config/modules.ts missing event ${ev} for ${name}`)
            }
          }
        }
      }

      for (const peer of missingAdonisPeers(flags.cwd, name)) {
        warnings.push(formatMissingPeer(peer))
      }

      if (manifest.configKeys.length) {
        const configPath = join(flags.cwd, 'config/modules.ts')
        if (!existsSync(configPath)) {
          warnings.push(`config/modules.ts missing (configKeys for ${name})`)
        } else {
          const text = readFileSync(configPath, 'utf8')
          for (const key of manifest.configKeys) {
            const leaf = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key
            if (!hasConfigKey(text, leaf)) {
              warnings.push(`config/modules.ts missing key ${leaf} (${key}) for ${name}`)
            }
          }
        }
      }
    } catch (err) {
      warnings.push(err instanceof Error ? err.message : String(err))
    }
  }

  // aliases
  const pkgPath = join(flags.cwd, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { imports?: Record<string, string> }
    const imports = pkg.imports ?? {}
    for (const key of Object.keys(REQUIRED_IMPORTS)) {
      if (!(key in imports)) {
        warnings.push(`package.json imports missing ${key}`)
      }
    }
  }

  const adonisrc = join(flags.cwd, 'adonisrc.ts')
  if (existsSync(adonisrc) && !readFileSync(adonisrc, 'utf8').includes('#modules/api/provider')) {
    warnings.push('adonisrc.ts missing #modules/api/provider (run init --wire)')
  }
  const kernel = join(flags.cwd, 'start/kernel.ts')
  if (existsSync(kernel) && !readFileSync(kernel, 'utf8').includes('#modules/api/exception_handler')) {
    warnings.push('start/kernel.ts missing exception_handler (run init --wire)')
  }

  for (const w of warnings) console.warn(`warn: ${w}`)
  for (const e of errors) console.error(`error: ${e}`)

  if (errors.length) process.exitCode = 1
  else if (flags.strict && warnings.length) process.exitCode = 1
  else if (!errors.length) console.log('check passed' + (warnings.length ? ` (${warnings.length} warnings)` : ''))
}

function hasConfigKey(text: string, leaf: string): boolean {
  const re = new RegExp(`\\b${escapeRegExp(leaf)}\\s*:`)
  return re.test(text)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function peerModelToPath(alias: string, modelsPath: string, cwd: string): string {
  // #models/user → app/models/user.ts
  const name = alias.replace(/^#models\//, '')
  return join(cwd, modelsPath, `${name}.ts`)
}
