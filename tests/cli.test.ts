import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, it, before } from 'node:test'
import { moduleManifestSchema } from '../src/schema.js'

const pkgRoot = resolve(fileURLToPath(import.meta.url), '../..')
const bundled = join(pkgRoot, 'registry')
const cli = join(pkgRoot, 'build/cli.js')

function run(
  args: string[],
  cwd: string,
  extra: string[] = []
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
  it('parses every bundled module.json', () => {
    const names = ['api', 'auth', 'account', 'notification', 'creem', 'subscription']
    for (const name of names) {
      const raw = JSON.parse(readFileSync(join(bundled, name, 'module.json'), 'utf8'))
      const parsed = moduleManifestSchema.safeParse(raw)
      assert.equal(parsed.success, true, `${name}: ${JSON.stringify(parsed.error?.format())}`)
    }
  })
})

describe('adonia CLI', () => {
  let host: string

  before(() => {
    assert.ok(existsSync(cli), 'build/cli.js missing — run npm run build')
    assert.ok(existsSync(join(bundled, 'auth', 'module.json')), 'bundled registry missing')
  })

  it('help mentions Adonia', () => {
    const r = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' })
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes('Adonia'))
    assert.ok(r.stdout.includes('adonia'))
  })

  it('init writes adonia.json and copies core from bundled registry', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'adonia.json')))
    const cfg = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8'))
    assert.equal(cfg.registry, 'bundled')
    assert.ok(existsSync(join(host, 'modules/api')))
    assert.ok(existsSync(join(host, 'modules/types')))
    assert.ok(!existsSync(join(host, 'modules/auth')))
  })

  it('init --wire adds aliases and provider', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init', '--wire'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const pkg = JSON.parse(readFileSync(join(host, 'package.json'), 'utf8'))
    assert.ok(pkg.imports['#modules/*'])
    const adonisrc = readFileSync(join(host, 'adonisrc.ts'), 'utf8')
    assert.ok(adonisrc.includes('#modules/api/provider'))
  })

  it('add auth installs stubs and config events', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'modules/auth/service.ts')))
    assert.ok(existsSync(join(host, 'app/models/user.ts')))
    const modulesConfig = readFileSync(join(host, 'config/modules.ts'), 'utf8')
    assert.ok(modulesConfig.includes('Auth:Login'))
  })

  it('add auth second time is a no-op without --overwrite', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    const service = join(host, 'modules/auth/service.ts')
    writeFileSync(service, readFileSync(service, 'utf8') + '\n// local edit\n')
    assert.equal(run(['add', 'auth'], host).status, 0)
    assert.ok(readFileSync(service, 'utf8').includes('// local edit'))
  })

  it('overwrite replaces edited files', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    const service = join(host, 'modules/auth/service.ts')
    writeFileSync(service, '// dirty\n')
    const r = spawnSync(
      process.execPath,
      [cli, '--overwrite', '--yes', '--cwd', host, 'add', 'auth'],
      { encoding: 'utf8' }
    )
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(!readFileSync(service, 'utf8').startsWith('// dirty'))
  })

  it('add subscription installs creem first', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    const r = run(['add', 'subscription'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed as string[]
    assert.ok(installed.indexOf('creem') < installed.indexOf('subscription'))
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
      [cli, '--yes', '--cwd', host, 'add', 'auth', '--skip-stubs'],
      { encoding: 'utf8' }
    )
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.equal(run(['check'], host).status, 1)
  })

  it('reads legacy modules.json', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    writeFileSync(join(host, 'modules.json'), readFileSync(join(host, 'adonia.json'), 'utf8'))
    unlinkSync(join(host, 'adonia.json'))
    assert.equal(run(['list'], host).status, 0)
  })

  it('--registry flag overrides bundled', () => {
    host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init'], host, ['--registry', bundled])
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'modules/api')))
  })
})
