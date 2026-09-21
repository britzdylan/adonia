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
