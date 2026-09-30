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
          '#start/*': './start/*.js',
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
  writeFileSync(join(dir, 'start/routes.ts'), `import router from '@adonisjs/core/services/router'\n`)
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
  before(() => {
    assert.ok(existsSync(cli), 'build/cli.js missing — run npm run build')
    assert.ok(existsSync(fixture), 'fixture modules missing')
  })

  it('help has no FormWire product strings', () => {
    const r = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' })
    assert.equal(r.status, 0)
    assert.ok(
      r.stdout
        .replace(/\s+/g, ' ')
        .includes(
          'A CLI that copies AdonisJS modules from a registry into your app.'
        )
    )
    assert.ok(r.stdout.includes('adonia'))
    const productText = r.stdout
      .split('\n')
      .filter((line) => !line.includes('/') && !line.includes('\\'))
      .join('\n')
    assert.ok(!/formwire/i.test(productText), productText)
  })

  it('init writes adonia.json and copies core', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'adonia.json')))
    assert.ok(!existsSync(join(host, 'modules.json')))
    const cfg = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8'))
    assert.equal(cfg.registry, 'bundled')
    assert.ok(existsSync(join(host, 'modules/api')))
    assert.ok(existsSync(join(host, 'modules/types')))
    assert.ok(!existsSync(join(host, 'modules/adapters')))
    assert.ok(!existsSync(join(host, 'modules/auth')))
    const adonisrc = readFileSync(join(host, 'adonisrc.ts'), 'utf8')
    assert.ok(!adonisrc.includes('#modules/api/provider'))
  })

  it('init --wire adds aliases and provider', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init', '--wire'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const pkg = JSON.parse(readFileSync(join(host, 'package.json'), 'utf8'))
    assert.ok(pkg.imports['#modules/*'])
    assert.ok(pkg.imports['#constants'])
    assert.ok(pkg.imports['#adapters/*'])
    assert.ok(!pkg.imports['#modules/adapters'])
    const adonisrc = readFileSync(join(host, 'adonisrc.ts'), 'utf8')
    assert.ok(adonisrc.includes('#modules/api/provider'))
    assert.ok(existsSync(join(host, 'config/modules.ts')))
  })

  it('init --wire adds server import when kernel lacks it', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
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

  it('list without adonia.json shows the registry only', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['list'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const out = r.stdout + r.stderr
    assert.ok(/no adonia\.json/i.test(out), out)
    assert.ok(/Registry \(flag\)/.test(out), out)
    assert.match(out, /api\s+\[available\]/)
    assert.match(out, /auth\s+\[available\]/)
    assert.ok(!/formwire/i.test(out), out)
  })

  it('list reflects installed vs available after init and add', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const afterInit = run(['list'], host)
    assert.equal(afterInit.status, 0, afterInit.stderr + afterInit.stdout)
    const initOut = afterInit.stdout + afterInit.stderr
    assert.match(initOut, /api\s+\[installed\]/)
    assert.match(initOut, /types\s+\[installed\]/)
    assert.match(initOut, /auth\s+\[available\]/)
    assert.match(initOut, /account\s+\[available\]/)
    assert.equal(run(['add', 'auth'], host).status, 0)
    const afterAdd = run(['list'], host)
    assert.equal(afterAdd.status, 0, afterAdd.stderr + afterAdd.stdout)
    const addOut = afterAdd.stdout + afterAdd.stderr
    assert.match(addOut, /auth\s+\[installed\]/)
    assert.match(addOut, /account\s+\[available\]/)
    assert.ok(!/formwire/i.test(addOut), addOut)
  })

  it('init --dry-run writes nothing', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const pkgBefore = readFileSync(join(host, 'package.json'), 'utf8')
    const adonisrcBefore = readFileSync(join(host, 'adonisrc.ts'), 'utf8')
    const kernelBefore = readFileSync(join(host, 'start/kernel.ts'), 'utf8')
    const r = run(['init', '--wire', '--dry-run'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const out = r.stdout + r.stderr
    assert.ok(/Would write adonia\.json/.test(out), out)
    assert.ok(/Would wire/.test(out), out)
    assert.ok(/would-copy/.test(out), out)
    assert.ok(!existsSync(join(host, 'adonia.json')))
    assert.ok(!existsSync(join(host, 'modules/api')))
    assert.equal(readFileSync(join(host, 'package.json'), 'utf8'), pkgBefore)
    assert.equal(readFileSync(join(host, 'adonisrc.ts'), 'utf8'), adonisrcBefore)
    assert.equal(readFileSync(join(host, 'start/kernel.ts'), 'utf8'), kernelBefore)
  })

  it('add auth installs module files without stubs by default', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'modules/auth/service.ts')))
    assert.ok(!existsSync(join(host, 'modules/auth/adapters')))
    assert.ok(!existsSync(join(host, 'app/adapters/auth.ts')))
    assert.ok(!existsSync(join(host, 'app/models/user.ts')))
    assert.ok(!existsSync(join(host, 'start/routes/auth.ts')))
    assert.ok(!existsSync(join(host, 'providers/vine_provider.ts')))
    assert.ok(!existsSync(join(host, 'start/limiter.ts')))
    assert.ok(!existsSync(join(host, 'modules/auth/tests')))
    const modulesConfig = readFileSync(join(host, 'config/modules.ts'), 'utf8')
    assert.ok(modulesConfig.includes('Auth:Login'))
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed
    assert.ok(installed.includes('auth'))
    assert.ok(installed.includes('api'))
    const out = r.stdout + r.stderr
    assert.ok(/--with-stubs/.test(out), out)
  })

  it('add auth --with-tests copies colocated module tests', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth', '--with-tests'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'modules/auth/tests/auth_service.spec.ts')))
    assert.ok(existsSync(join(host, 'modules/auth/tests/auth_update_password.spec.ts')))
    assert.ok(existsSync(join(host, 'modules/auth/tests/fakes/memory_user_store.ts')))
    assert.ok(!existsSync(join(host, 'app/models/user.ts')))
    assert.ok(!existsSync(join(host, 'modules/api/tests')), r.stdout + r.stderr)
    const out = r.stdout + r.stderr
    assert.ok(/copied: test:/.test(out), out)
    assert.ok(!/formwire/i.test(out), out)
  })

  it('add --dry-run does not copy files, stubs, or mark installed', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const installedBefore = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8'))
      .installed as string[]
    const modulesConfigBefore = readFileSync(join(host, 'config/modules.ts'), 'utf8')
    const routesBefore = readFileSync(join(host, 'start/routes.ts'), 'utf8')
    const r = run(
      ['add', 'auth', '--dry-run', '--with-stubs', '--with-routes', '--wire-routes'],
      host
    )
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const out = r.stdout + r.stderr
    assert.ok(/would-copy/.test(out), out)
    assert.ok(/would process/.test(out), out)
    assert.ok(/Would wire routes/.test(out), out)
    assert.ok(!existsSync(join(host, 'modules/auth/service.ts')))
    assert.ok(!existsSync(join(host, 'app/models/user.ts')))
    assert.ok(!existsSync(join(host, 'app/controllers/auth_controller.ts')))
    assert.ok(!existsSync(join(host, 'start/routes/auth.ts')))
    assert.ok(!existsSync(join(host, 'start/limiter.ts')))
    assert.equal(readFileSync(join(host, 'start/routes.ts'), 'utf8'), routesBefore)
    assert.equal(readFileSync(join(host, 'config/modules.ts'), 'utf8'), modulesConfigBefore)
    const installedAfter = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8'))
      .installed as string[]
    assert.deepEqual(installedAfter, installedBefore)
    assert.ok(!installedAfter.includes('auth'))
  })

  it('add auth --with-stubs copies models and controllers', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth', '--with-stubs'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'app/models/user.ts')))
    assert.ok(existsSync(join(host, 'app/models/password_reset.ts')))
    assert.ok(existsSync(join(host, 'app/controllers/auth_controller.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/auth.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/lucid_user_store.ts')))
    assert.ok(existsSync(join(host, 'providers/vine_provider.ts')))
    assert.ok(existsSync(join(host, 'start/limiter.ts')))
    assert.ok(!existsSync(join(host, 'start/routes/auth.ts')))
    assert.ok(/node ace add @adonisjs\/limiter/.test(r.stdout + r.stderr), r.stdout + r.stderr)
  })

  it('add auth --with-adapters copies Lucid factories without controllers', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth', '--with-adapters'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'app/adapters/auth.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/lucid_user_store.ts')))
    assert.ok(!existsSync(join(host, 'app/controllers/auth_controller.ts')))
    assert.ok(!existsSync(join(host, 'modules/auth/adapters')))
    assert.ok(!/node ace add @adonisjs\/limiter/.test(r.stdout + r.stderr))
  })

  it('add account --with-adapters tells host to ace add drive', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'account', '--with-adapters'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'app/adapters/drive_avatar_storage.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/account.ts')))
    assert.ok(!existsSync(join(host, 'modules/account/adapters')))
    assert.ok(/node ace add @adonisjs\/drive/.test(r.stdout + r.stderr), r.stdout + r.stderr)
  })

  it('add notification --with-adapters tells host to ace add mail', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'notification', '--with-adapters'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'app/adapters/adonis_mail_transport.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/notification.ts')))
    assert.ok(!existsSync(join(host, 'modules/notification/adapters')))
    assert.ok(/node ace add @adonisjs\/mail/.test(r.stdout + r.stderr), r.stdout + r.stderr)
  })

  it('add auth --with-controllers --with-validators --with-routes writes full auth HTTP surface', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(
      ['add', 'auth', '--with-controllers', '--with-validators', '--with-routes'],
      host
    )
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(!existsSync(join(host, 'app/models/user.ts')))
    const controller = readFileSync(join(host, 'app/controllers/auth_controller.ts'), 'utf8')
    assert.ok(controller.includes('async logout'))
    assert.ok(controller.includes('async validatePasswordReset'))
    assert.ok(controller.includes('async sendAccountActivationEmail'))
    assert.ok(/vine provider/i.test(controller))
    assert.ok(/named auth middleware/i.test(controller))
    const routes = readFileSync(join(host, 'start/routes/auth.ts'), 'utf8')
    assert.ok(routes.includes("post('logout'"))
    assert.ok(routes.includes("post('password/validate'"))
    assert.ok(routes.includes("post('activate/request'"))
    assert.ok(routes.includes('authLimiter'))
    const validators = readFileSync(join(host, 'app/validators/auth.ts'), 'utf8')
    assert.ok(validators.includes('normalizeEmail()'))
    assert.ok(validators.includes('validPassword()'))
    assert.ok(validators.includes('resendActivationValidator'))
    assert.ok(validators.includes('validatePasswordResetValidator'))
    assert.ok(existsSync(join(host, 'app/validators/rules/unique.ts')))
    assert.ok(existsSync(join(host, 'app/validators/rules/exists.ts')))
    assert.ok(existsSync(join(host, 'app/validators/rules/valid_token.ts')))
    assert.ok(existsSync(join(host, 'app/validators/rules/valid_password.ts')))
    assert.ok(existsSync(join(host, 'app/validators/vine.d.ts')))
    assert.ok(existsSync(join(host, 'providers/vine_provider.ts')))
    assert.ok(existsSync(join(host, 'start/limiter.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/auth.ts')))
    const adapter = readFileSync(join(host, 'app/adapters/auth.ts'), 'utf8')
    assert.ok(adapter.includes('createAuthService'))
    const stubText = [
      controller,
      routes,
      validators,
      readFileSync(join(host, 'providers/vine_provider.ts'), 'utf8'),
      readFileSync(join(host, 'start/limiter.ts'), 'utf8'),
      readFileSync(join(host, 'app/validators/rules/unique.ts'), 'utf8'),
    ].join('\n')
    assert.ok(!/formwire/i.test(stubText), stubText)
  })

  it('add account --with-controllers --with-validators --with-routes writes full account HTTP surface', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(
      ['add', 'account', '--with-controllers', '--with-validators', '--with-routes'],
      host
    )
    assert.equal(r.status, 0, r.stderr + r.stdout)
    const controller = readFileSync(join(host, 'app/controllers/account_controller.ts'), 'utf8')
    assert.ok(controller.includes('async getAuthenticatedUser'))
    assert.ok(controller.includes('async deleteAccount'))
    assert.ok(controller.includes('async getNotifications'))
    assert.ok(controller.includes('async updateNotifications'))
    assert.ok(controller.includes('async getInboxNotifications'))
    assert.ok(controller.includes('async markNotificationRead'))
    assert.ok(controller.includes('async markAllNotificationsRead'))
    assert.ok(/vine provider/i.test(controller))
    assert.ok(/named auth middleware/i.test(controller))
    const routes = readFileSync(join(host, 'start/routes/account.ts'), 'utf8')
    assert.ok(routes.includes("get('user'"))
    assert.ok(routes.includes("delete('/'"))
    assert.ok(routes.includes("get('notifications'"))
    assert.ok(routes.includes("put('notifications'"))
    assert.ok(routes.includes("get('inbox'"))
    assert.ok(routes.includes("post('inbox/read-all'"))
    assert.ok(routes.includes("patch('inbox/:id'"))
    assert.ok(routes.includes('accountLimiter'))
    const validators = readFileSync(join(host, 'app/validators/account.ts'), 'utf8')
    assert.ok(validators.includes('normalizeEmail()'))
    assert.ok(validators.includes('validPassword()'))
    assert.ok(validators.includes('confirmed()'))
    assert.ok(validators.includes('trim().maxLength(80)'))
    assert.ok(validators.includes('updateNotificationsValidator'))
    assert.ok(validators.includes('emailMarketing'))
    const limiter = readFileSync(join(host, 'start/limiter.ts'), 'utf8')
    assert.ok(limiter.includes('accountLimiter'))
    const stubText = [controller, routes, validators, limiter].join('\n')
    assert.ok(!/formwire/i.test(stubText), stubText)
  })

  it('add auth --with-routes --wire-routes mounts route file', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth', '--with-routes', '--wire-routes'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(existsSync(join(host, 'start/routes/auth.ts')))
    assert.ok(existsSync(join(host, 'start/limiter.ts')))
    assert.ok(!existsSync(join(host, 'providers/vine_provider.ts')))
    assert.ok(!existsSync(join(host, 'app/adapters/auth.ts')))
    const routes = readFileSync(join(host, 'start/routes.ts'), 'utf8')
    assert.ok(routes.includes("./routes/auth.js"), routes)
  })

  it('wire-routes without route file exits 1', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const r = run(['add', 'auth', '--wire-routes'], host)
    assert.equal(r.status, 1, r.stderr + r.stdout)
    assert.ok(/missing start\/routes\/auth\.ts/i.test(r.stderr + r.stdout))
  })

  it('add auth second time is a no-op without --overwrite', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
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
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    mkdirSync(join(host, 'app/models'), { recursive: true })
    writeFileSync(join(host, 'app/models/user.ts'), '// host user stub\n')
    const r = run(['add', 'auth', '--with-models'], host)
    assert.equal(r.status, 1, r.stderr + r.stdout)
    assert.ok(
      /Not recorded in adonia\.json/i.test(r.stderr + r.stdout),
      r.stderr + r.stdout
    )
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed as string[]
    assert.ok(!installed.includes('auth'), `installed=${installed.join(',')}`)
    const retry = run(['add', 'auth', '--with-models'], host)
    assert.equal(retry.status, 1, retry.stderr + retry.stdout)
    assert.ok(!/Nothing to install/.test(retry.stdout + retry.stderr))
  })

  it('overwrite replaces edited files', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
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
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
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
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    assert.equal(run(['diff', 'auth'], host).status, 0)
    writeFileSync(join(host, 'modules/auth/service.ts'), '// edit\n', { flag: 'a' })
    assert.equal(run(['diff', 'auth'], host).status, 1)
  })

  it('check warns when limiter stub is present without the package', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    assert.equal(run(['add', 'auth', '--with-stubs'], host).status, 0)
    const check = run(['check'], host)
    assert.equal(check.status, 0, check.stdout + check.stderr)
    const out = check.stdout + check.stderr
    assert.ok(/node ace add @adonisjs\/limiter/.test(out), out)
    assert.ok(/check passed/.test(out), out)
  })

  it('check --strict fails when there are only warnings', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    assert.equal(run(['init', '--wire'], host).status, 0)
    const loose = run(['check'], host)
    assert.equal(loose.status, 0, loose.stdout + loose.stderr)
    const looseOut = loose.stdout + loose.stderr
    assert.ok(/check passed/.test(looseOut), looseOut)
    assert.ok(/warn:/.test(looseOut), looseOut)
    const strict = run(['check', '--strict'], host)
    assert.equal(strict.status, 1, strict.stdout + strict.stderr)
    const strictOut = strict.stdout + strict.stderr
    assert.ok(/warn:/.test(strictOut), strictOut)
    assert.ok(!/error:/.test(strictOut), strictOut)
  })

  it('check fails when peer model missing after plain add', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    const r = run(['add', 'auth'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(!existsSync(join(host, 'app/models/password_reset.ts')))
    const check = run(['check'], host)
    assert.equal(check.status, 1, check.stdout + check.stderr)
  })

  it('check fails when installed misses registryDependencies', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    run(['init', '--wire'], host)
    run(['add', 'auth'], host)
    const cfgPath = join(host, 'adonia.json')
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
    cfg.installed = ['auth']
    writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`)
    const check = run(['check'], host)
    assert.equal(check.status, 1, check.stdout + check.stderr)
    const out = check.stdout + check.stderr
    assert.ok(/requires "api"/i.test(out), out)
  })

  it('init --scaffold installs feature modules with stubs and routes', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
    fakeAdonis(host)
    const r = run(['init', '--scaffold'], host)
    assert.equal(r.status, 0, r.stderr + r.stdout)
    assert.ok(/implies --wire/i.test(r.stdout + r.stderr))
    const installed = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8')).installed as string[]
    assert.ok(installed.includes('auth'))
    assert.ok(installed.includes('account'))
    assert.ok(installed.includes('subscription'))
    assert.ok(existsSync(join(host, 'app/models/user.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/auth.ts')))
    assert.ok(existsSync(join(host, 'app/adapters/account.ts')))
    assert.ok(existsSync(join(host, 'start/routes/auth.ts')))
    assert.ok(existsSync(join(host, 'start/routes/account.ts')))
    const routes = readFileSync(join(host, 'start/routes.ts'), 'utf8')
    assert.ok(routes.includes("./routes/auth.js"), routes)
    assert.ok(routes.includes("./routes/account.js"), routes)
  })

  it('github: registry fails closed without bundled fallback', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
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
    const host = mkdtempSync(join(tmpdir(), 'adonia-'))
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
