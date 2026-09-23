import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const REQUIRED_IMPORTS: Record<string, string> = {
  '#modules/*': './modules/*.js',
  '#modules/types': './modules/types/index.js',
  '#modules/contracts': './modules/contracts/index.js',
  '#constants': './modules/constants/index.js',
  '#constants/*': './modules/constants/*.js',
  '#adapters/*': './app/adapters/*.js',
}

const EMPTY_MODULES_CONFIG = `const modulesConfig: Record<string, { description: string; emits: string[] }> = {}

export default modulesConfig
`

const EXCEPTION_HANDLER_REEXPORT = `export { default } from '#modules/api/exception_handler'
`

export function printWireChecklist(): void {
  console.log(`
Host wiring checklist (run \`init --wire\` to apply automatically):
  1. Merge #modules/*, #modules/types, #modules/contracts,
     #constants, #constants/*, #adapters/* into package.json "imports".
  2. Append () => import('#modules/api/provider') to adonisrc.ts providers.
  3. Set server.errorHandler(() => import('#modules/api/exception_handler')) in start/kernel.ts.
  4. Create app/exceptions/handler.ts re-export of #modules/api/exception_handler.
  5. Create config/modules.ts with an empty Record if missing.
`)
}

export function applyWire(cwd: string, dryRun = false): string[] {
  const actions: string[] = []

  actions.push(...mergePackageImports(cwd, dryRun))
  actions.push(...ensureProvider(cwd, dryRun))
  actions.push(...ensureErrorHandler(cwd, dryRun))
  actions.push(...ensureExceptionHandlerFile(cwd, dryRun))
  actions.push(...ensureModulesConfig(cwd, dryRun))

  return actions
}

function mergePackageImports(cwd: string, dryRun: boolean): string[] {
  const pkgPath = join(cwd, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    imports?: Record<string, string>
  }
  pkg.imports ??= {}
  const added: string[] = []
  for (const [key, value] of Object.entries(REQUIRED_IMPORTS)) {
    if (pkg.imports[key] === value) continue
    if (!(key in pkg.imports)) {
      pkg.imports[key] = value
      added.push(key)
    } else if (pkg.imports[key] !== value) {
      // leave host override; only fill missing
      continue
    }
  }
  if (added.length && !dryRun) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }
  return added.map((k) => `imports: ${k}`)
}

function ensureProvider(cwd: string, dryRun: boolean): string[] {
  const path = join(cwd, 'adonisrc.ts')
  if (!existsSync(path)) return []
  let content = readFileSync(path, 'utf8')
  if (content.includes('#modules/api/provider')) return []
  const providerLine = `    () => import('#modules/api/provider'),`

  if (/providers:\s*\[/.test(content)) {
    content = content.replace(/providers:\s*\[/, (m) => `${m}\n${providerLine}`)
  } else {
    content += `\nexport const providers = [\n${providerLine}\n]\n`
  }
  if (!dryRun) writeFileSync(path, content)
  return ['adonisrc.ts providers']
}

function ensureErrorHandler(cwd: string, dryRun: boolean): string[] {
  const path = join(cwd, 'start/kernel.ts')
  if (!existsSync(path)) {
    if (!dryRun) {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(
        path,
        `import server from '@adonisjs/core/services/server'\n\nserver.errorHandler(() => import('#modules/api/exception_handler'))\n`
      )
    }
    return ['start/kernel.ts (created)']
  }
  const original = readFileSync(path, 'utf8')
  if (original.includes('#modules/api/exception_handler')) return []

  // Decide before appending the errorHandler line — that line contains
  // `server.` and would otherwise hide a missing import.
  const needsServerImport =
    !original.includes("from '@adonisjs/core/services/server'") &&
    !original.includes('server.')

  let content =
    original + `\nserver.errorHandler(() => import('#modules/api/exception_handler'))\n`
  if (needsServerImport) {
    content = `import server from '@adonisjs/core/services/server'\n${content}`
  }
  if (!dryRun) writeFileSync(path, content)
  return ['start/kernel.ts errorHandler']
}

function ensureExceptionHandlerFile(cwd: string, dryRun: boolean): string[] {
  const path = join(cwd, 'app/exceptions/handler.ts')
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8')
    const isDefault =
      content.includes('@adonisjs/core/exceptions') ||
      content.trim().length < 40 ||
      /export default class HttpExceptionHandler/.test(content)
    if (!isDefault && content.includes('#modules/api/exception_handler')) return []
    if (!isDefault) return []
  }
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, EXCEPTION_HANDLER_REEXPORT)
  }
  return ['app/exceptions/handler.ts']
}

function ensureModulesConfig(cwd: string, dryRun: boolean): string[] {
  const path = join(cwd, 'config/modules.ts')
  if (existsSync(path)) return []
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, EMPTY_MODULES_CONFIG)
  }
  return ['config/modules.ts']
}

export { REQUIRED_IMPORTS, EMPTY_MODULES_CONFIG }

/**
 * Append a side-effect import of `start/routes/<module>.ts` into
 * `start/routes.ts`. Idempotent. Does not create the module route file.
 */
export function wireModuleRoute(
  cwd: string,
  moduleName: string,
  dryRun = false
): { ok: true; actions: string[] } | { ok: false; error: string } {
  const routeFile = join(cwd, 'start/routes', `${moduleName}.ts`)
  if (!existsSync(routeFile)) {
    return {
      ok: false,
      error:
        `Cannot --wire-routes for "${moduleName}": missing start/routes/${moduleName}.ts. ` +
        `Pass --with-routes first, or create the file.`,
    }
  }

  const routesPath = join(cwd, 'start/routes.ts')
  const importRelative = `./routes/${moduleName}.js`
  const importLine = `import '${importRelative}'`

  let content = existsSync(routesPath) ? readFileSync(routesPath, 'utf8') : ''
  if (
    content.includes(`'${importRelative}'`) ||
    content.includes(`"${importRelative}"`) ||
    content.includes(`'#start/routes/${moduleName}'`) ||
    content.includes(`"#start/routes/${moduleName}"`)
  ) {
    return { ok: true, actions: [] }
  }

  content = content.length ? `${content.trimEnd()}\n${importLine}\n` : `${importLine}\n`
  if (!dryRun) {
    mkdirSync(dirname(routesPath), { recursive: true })
    writeFileSync(routesPath, content)
  }
  return {
    ok: true,
    actions: [`start/routes.ts → ${importRelative}`],
  }
}

