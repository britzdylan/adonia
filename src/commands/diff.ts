import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { loadHostConfig } from '../host.js'
import { loadManifest, resolveRegistry } from '../registry/index.js'
import { planModuleFiles, planStubs } from '../registry/plan.js'
import { sha256 } from '../copy.js'
import type { SharedFlags } from '../types.js'

export async function runDiff(name: string | undefined, flags: SharedFlags): Promise<void> {
  if (!name) {
    console.error('Usage: adonia diff <name>')
    process.exitCode = 1
    return
  }

  let config
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

  const manifest = loadManifest(registry, name)
  const warnings: string[] = []
  const plans = [
    ...planModuleFiles(registry, name, manifest, config, flags.cwd),
    ...planStubs(registry, name, manifest, config, flags.cwd, warnings),
  ]

  let differed = false
  for (const plan of plans) {
    if (!existsSync(plan.dest)) {
      console.log(`--- missing: ${relative(flags.cwd, plan.dest)}`)
      differed = true
      continue
    }
    const a = readFileSync(plan.src)
    const b = readFileSync(plan.dest)
    if (sha256(a) === sha256(b)) continue
    differed = true
    console.log(unifiedDiff(relative(flags.cwd, plan.dest), a.toString('utf8'), b.toString('utf8')))
  }

  for (const w of warnings) console.warn(w)
  if (differed) process.exitCode = 1
  else console.log('No differences.')
}

function unifiedDiff(path: string, registry: string, host: string): string {
  const a = registry.split('\n')
  const b = host.split('\n')
  const lines = [`--- registry/${path}`, `+++ host/${path}`]
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    const left = a[i]
    const right = b[i]
    if (left === right) continue
    if (left !== undefined) lines.push(`-${left}`)
    if (right !== undefined) lines.push(`+${right}`)
  }
  return lines.join('\n')
}
