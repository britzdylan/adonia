import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hostModulesSchema, type HostModulesConfig } from './schema.js'

export const ADONIA_JSON = 'adonia.json'
/** @deprecated Read-only fallback for one minor after rename. */
export const LEGACY_MODULES_JSON = 'modules.json'

const require = createRequire(import.meta.url)

export function packageVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    try {
      return (require('../package.json') as { version: string }).version
    } catch {
      return '0.0.0'
    }
  }
}

export function isAdonisApp(cwd: string): { ok: true } | { ok: false; reason: string } {
  const adonisrc = join(cwd, 'adonisrc.ts')
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(adonisrc)) {
    return { ok: false, reason: 'adonisrc.ts not found — not an Adonis app' }
  }
  if (!existsSync(pkgPath)) {
    return { ok: false, reason: 'package.json not found' }
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (!deps['@adonisjs/core']) {
    return { ok: false, reason: 'package.json does not depend on @adonisjs/core' }
  }
  return { ok: true }
}

function configPath(cwd: string): string {
  const primary = join(cwd, ADONIA_JSON)
  if (existsSync(primary)) return primary
  const legacy = join(cwd, LEGACY_MODULES_JSON)
  if (existsSync(legacy)) return legacy
  throw new Error(`Missing ${ADONIA_JSON}. Run \`npx adonia init\` first.`)
}

export function loadHostConfig(cwd: string): HostModulesConfig {
  const path = configPath(cwd)
  return hostModulesSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

export function writeHostConfig(cwd: string, config: HostModulesConfig, dryRun = false): void {
  if (dryRun) return
  writeFileSync(join(cwd, ADONIA_JSON), `${JSON.stringify(config, null, 2)}\n`)
}

export function defaultHostConfig(): HostModulesConfig {
  return hostModulesSchema.parse({
    $schema: './node_modules/adonia/schema/adonia.schema.json',
    registry: 'bundled',
    ref: packageVersion(),
    paths: {
      modules: 'modules',
      models: 'app/models',
      migrations: 'database/migrations',
      controllers: 'app/controllers',
      validators: 'app/validators',
    },
    aliases: {
      modules: '#modules',
      constants: '#constants',
      models: '#models',
    },
    installed: [],
  })
}

export function detectPackageManager(cwd: string): 'npm' | 'pnpm' | 'yarn' {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}
