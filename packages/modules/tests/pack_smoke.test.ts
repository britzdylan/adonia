import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, it, before } from 'node:test'

const pkgRoot = resolve(fileURLToPath(import.meta.url), '../..')

function fakeAdonis(dir: string): void {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'pack-smoke-host',
        type: 'module',
        dependencies: { '@adonisjs/core': '^7.0.0' },
        imports: {
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

describe('adonia pack smoke', () => {
  let tgz: string
  let packDir: string

  before(() => {
    // Ensure registry + build exist (test script runs sync + build first)
    assert.ok(existsSync(join(pkgRoot, 'registry', 'auth', 'module.json')))
    assert.ok(existsSync(join(pkgRoot, 'build', 'cli.js')))

    packDir = mkdtempSync(join(tmpdir(), 'adonia-pack-'))
    // Skip prepack. It runs tsc, and these tests execute build/cli.js at the same time.
    const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', packDir], {
      cwd: pkgRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    assert.equal(packed.status, 0, packed.stderr + packed.stdout)
    const line = packed.stdout.trim().split('\n').pop()!
    tgz = join(packDir, line)
    assert.ok(existsSync(tgz), `missing tarball ${tgz}`)
  })

  it('init + add auth from tarball with no --registry', () => {
    const host = mkdtempSync(join(tmpdir(), 'adonia-host-'))
    fakeAdonis(host)

    const install = spawnSync('npm', ['install', tgz, '--no-save'], {
      cwd: host,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    assert.equal(install.status, 0, install.stderr + install.stdout)

    const adoniaBin = join(host, 'node_modules', 'adonia', 'build', 'cli.js')
    assert.ok(existsSync(adoniaBin))
    assert.ok(existsSync(join(host, 'node_modules', 'adonia', 'registry', 'auth', 'module.json')))

    const init = spawnSync(process.execPath, [adoniaBin, 'init', '--wire', '--yes', '--cwd', host], {
      encoding: 'utf8',
    })
    assert.equal(init.status, 0, init.stderr + init.stdout)

    const cfg = JSON.parse(readFileSync(join(host, 'adonia.json'), 'utf8'))
    assert.equal(cfg.registry, 'bundled')
    assert.ok(!/formwire/i.test(JSON.stringify(cfg)))

    const add = spawnSync(
      process.execPath,
      [adoniaBin, 'add', 'auth', '--with-stubs', '--yes', '--cwd', host],
      { encoding: 'utf8' }
    )
    assert.equal(add.status, 0, add.stderr + add.stdout)

    assert.ok(existsSync(join(host, 'modules/auth/service.ts')))
    assert.ok(existsSync(join(host, 'app/models/user.ts')))

    const check = spawnSync(process.execPath, [adoniaBin, 'check', '--cwd', host], {
      encoding: 'utf8',
    })
    assert.equal(check.status, 0, check.stdout + check.stderr)

    // cleanup large trees
    rmSync(host, { recursive: true, force: true })
  })
})
