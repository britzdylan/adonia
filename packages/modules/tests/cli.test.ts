import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, it, before } from 'node:test'
import { moduleManifestSchema } from '../src/schema.js'

const pkgRoot = resolve(fileURLToPath(import.meta.url), '../..')
const repoRoot = resolve(pkgRoot, '../..')
const fixture = join(repoRoot, 'apps/adonis-api-stater/modules')
const cli = join(pkgRoot, 'build/cli.js')

function run(
  args: string[],
  cwd: string,
  extra: string[] = ['--registry', fixture]
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [cli, ...args, '--cwd', cwd, ...extra, '--yes'],
    { encoding: 'utf8' }
  )
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function fakeAdonis(dir: string): void {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'fake-host',
        type: 'module',
        dependencies: { '@adonisjs/core': '^7.0.0' },
        imports: {
          '#controllers/*': './app/controllers/*.js',
          '#models/*': './app/models/*.js',
        },
      },
      null,
      2
    )
  )
  writeFileSync(
    join(dir, 'adonisrc.ts'),
    `export default {\n  providers: [\n    () => import('@adonisjs/core'),\n  ],\n}\n`
  )
  mkdirSync(join(dir, 'app'), { recursive: true })
  mkdirSync(join(dir, 'start'), { recursive: true })
  writeFileSync(join(dir, 'start/kernel.ts'), `import server from '@adonisjs/core/services/server'\n`)
  mkdirSync(join(dir, 'config'), { recursive: true })
}

describe('schema drift guard', () => {
  it('parses every fixture module.json', () => {
    const names = ['api', 'auth', 'account', 'notification', 'creem', 'subscription']
    for (const name of names) {
      const raw = JSON.parse(readFileSync(join(fixture, name, 'module.json'), 'utf8'))
      const parsed = moduleManifestSchema.safeParse(raw)
      assert.equal(parsed.success, true, `${name}: ${JSON.stringify(parsed.error?.format())}`)
    }
  })
})

describe('adonia CLI', () => {
  let host: string

  before(() => {
    assert.ok(existsSync(cli), 'build/cli.js missing — run npm run build')
    assert.ok(existsSync(fixture), 'fixture modules missing')
  })

  it('help has no FormWire product strings', () => {
    const r = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' })
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes('Adonia'))
    assert.ok(r.stdout.includes('adonia'))
    // Ignore absolute paths (workshop checkout may contain the string)
    const productText = r.stdout
      .split('\n')
      .filter((line) => !line.includes('/') && !line.includes('\\'))
      .join('\n')
    assert.ok(!/formwire/i.test(productText), productText)
  })

  it('init writes adonia.json and copies core', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'adonia.json')))
    assert.ok(!existsSync(join(host, 'modules.json')))
    const cfg = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8'))
    assert.equal(cfg.registry, 'bundled')
    assert.ok(existsSync(join(host, 'modules/api')))
    assert.ok(existsSync(join(host, 'modules/types')))
    assert.ok(!existsSync(join(host, 'modules/auth')))
    const adonisrc = readFileSync(join(host, 'adonisrc.ts'), 'utf8')
    assert.ok(!adonisrc.includes('#modules/api/provider'))
  })

  it('init --wire adds aliases and provider', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init', '--wire'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const pkg = JSON.parse(readFileSync(join(host, 'package.json'), 'utf8'))
    assert.ok(pkg.imports['#modules/*'])
    assert.ok(pkg.imports['#constants'])
    const adonisrc = readFileSync(join(host, 'adonisrc.ts'), 'utf8')
    assert.ok(adonisrc.includes('#modules/api/provider'))
    assert.ok(existsSync(join(host, 'config/modules.ts')))
  })

  it('init --wire adds server import when kernel lacks it', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    writeFileSync(
      join(host, 'start/kernel.ts'),
      `import router from '@adonisjs/core/services/router'\n`
    )
    const r = run(['init', '--wire'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const kernel = readFileSync(join(host, 'start/kernel.ts'), 'utf8')
    assert.ok(
      kernel.includes("from '@adonisjs/core/services/server'"),
      'expected server import\n' + kernel
    )
    assert.ok(kernel.includes('#modules/api/exception_handler'))
    assert.equal(
      kernel.split("from '@adonisjs/core/services/server'").length - 1,
      1,
      'duplicate server import'
    )
  })

  it('add auth installs core, stubs, and config events', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'modules/auth/service.ts')))
    assert.ok(existsSync(join(host, 'app/models/user.ts')))
    assert.ok(existsSync(join(host, 'app/models/password_reset.ts')))
    const modulesConfig = readFileSync(join(host, 'config/modules.ts'), 'utf8')
    assert.ok(modulesConfig.includes('Auth:Login'))
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed
    assert.ok(installed.includes('auth'))
    assert.ok(installed.includes('api'))
  })

  it('add auth second time is a no-op without --overwrite', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    const service = join(host, 'modules/auth/service.ts')
    const before = readFileSync(service, 'utf8')
    writeFileSync(service, before + '\n// local edit\n')
    const r = run(['add', 'auth'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(readFileSync(service, 'utf8').includes('// local edit'))
  })

  it('add auth conflict does not mark installed', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    mkdirSync(join(host, 'app/models'), { recursive: true })
    writeFileSync(join(host, 'app/models/user.ts'), '// host user stub\n')
    const r = run(['add', 'auth'], host)
    assert.equal(r.status, 1, r.stderr + r.stdout)
    assert.ok(
      /Not recorded in adonia\.json/i.test(r.stderr + r.stdout),
      r.stderr + r.stdout
    )
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed as string[]
    assert.ok(!installed.includes('auth'), `installed=${installed.join(',')}`)
    const retry = run(['add', 'auth'], host)
    assert.equal(retry.status, 1, retry.stderr + retry.stdout)
    assert.ok(!/Nothing to install/.test(retry.stdout + retry.stderr))
  })

  it('overwrite replaces edited files', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    const service = join(host, 'modules/auth/service.ts')
    writeFileSync(service, '// dirty\n')
    const r2 = spawnSync(
      process.execPath,
      [cli, '--overwrite', '--yes', '--cwd', host, '--registry', fixture, 'add', 'auth'],
      { encoding: 'utf8' }
    )
    assert.equal(r2.status, 0, r2.stderr + r2.stdout)
    assert.ok(!readFileSync(service, 'utf8').startsWith('// dirty'))
  })

  it('add subscription installs creem first', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    const r = run(['add', 'subscription'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed as string[]
    const creemIdx = installed.indexOf('creem')
    const subIdx = installed.indexOf('subscription')
    assert.ok(creemIdx >= 0 && subIdx >= 0)
    assert.ok(creemIdx < subIdx)
  })

  it('diff auth exits 1 after local edit', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    assert.equal(run(['diff', 'auth'], host).status, 0)
    writeFileSync(join(host, 'modules/auth/service.ts'), '// edit\n', { flag: 'a' })
    assert.equal(run(['diff', 'auth'], host).status, 1)
  })

  it('check fails when peer model missing after skip-stubs', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    const r = spawnSync(
      process.execPath,
      [cli, '--yes', '--cwd', host, '--registry', fixture, 'add', 'auth', '--skip-stubs'],
      { encoding: 'utf8' }
    )
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(!existsSync(join(host, 'app/models/password_reset.ts')))
    const check = run(['check'], host)
    assert.equal(check.status, 1, check.stdout + check.stderr)
  })

  it('check fails when installed misses registryDependencies', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth', '--skip-stubs'], host)
    const cfgPath = join(host, 'adonia.json')
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
    cfg.installed = ['auth']
    writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`)
    const check = run(['check'], host)
    assert.equal(check.status, 1, check.stdout + check.stderr)
    const out = check.stdout + check.stderr
    assert.ok(/requires "api"/i.test(out), out)
  })

  it('github: registry fails closed without bundled fallback', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    writeFileSync(
      join(host, 'adonia.json'),
      JSON.stringify(
        {
          registry: 'github:acme/mods/registry',
          ref: 'main',
          paths: {
            modules: 'modules',
            models: 'app/models',
            migrations: 'database/migrations',
            controllers: 'app/controllers',
            validators: 'app/validators',
          },
          aliases: { modules: '#modules', constants: '#constants', models: '#models' },
          installed: [],
        },
        null,
        2
      ) + '\n'
    )
    const r = run(['list'], host, [])
    assert.notEqual(r.status, 0, r.stderr + r.stdout)
    const out = r.stdout + r.stderr
    assert.ok(/not supported/i.test(out), out)
    assert.ok(!existsSync(join(host, 'modules/api')))
  })

  it('reads legacy modules.json', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    const cfg = readFileSync(join(host, 'adonia.json'), 'utf8')
    writeFileSync(join(host, 'modules.json'), cfg)
    unlinkSync(join(host, 'adonia.json'))
    const r = run(['list'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(r.stdout.includes('api'))
  })
})
