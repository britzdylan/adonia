#!/usr/bin/env node
import { Command } from 'commander'
import { resolve } from 'node:path'
import { runAdd } from './commands/add.js'
import { runCheck } from './commands/check.js'
import { runDiff } from './commands/diff.js'
import { runInit } from './commands/init.js'
import { runList } from './commands/list.js'
import { packageVersion } from './host.js'
import type { ScaffoldFlags, SharedFlags } from './types.js'

const program = new Command()

program
  .name('adonia')
  .description('Adonia modules for AdonisJS')
  .version(packageVersion())

function shared(cmd: Command): SharedFlags {
  const opts = cmd.optsWithGlobals() as {
    cwd?: string
    yes?: boolean
    dryRun?: boolean
    registry?: string
    overwrite?: boolean
  }
  return {
    cwd: resolve(opts.cwd ?? process.cwd()),
    yes: Boolean(opts.yes),
    dryRun: Boolean(opts.dryRun),
    registry: opts.registry,
    overwrite: Boolean(opts.overwrite),
  }
}

function scaffoldFromOpts(opts: Record<string, unknown>): ScaffoldFlags {
  return {
    withModels: Boolean(opts.withModels),
    withMigrations: Boolean(opts.withMigrations),
    withControllers: Boolean(opts.withControllers),
    withValidators: Boolean(opts.withValidators),
    withStubs: Boolean(opts.withStubs),
    withRoutes: Boolean(opts.withRoutes),
    wireRoutes: Boolean(opts.wireRoutes),
    withTests: Boolean(opts.withTests),
  }
}

function addScaffoldOptions(cmd: Command): Command {
  return cmd
    .option('--with-models', 'copy stubs/models into the host', false)
    .option('--with-migrations', 'copy stubs/migrations into the host', false)
    .option('--with-controllers', 'copy stubs/controllers into the host', false)
    .option('--with-validators', 'copy stubs/validators into the host', false)
    .option('--with-stubs', 'copy models, migrations, controllers, and validators', false)
    .option('--with-routes', 'copy stubs/routes into start/routes/', false)
    .option('--wire-routes', 'append imports in start/routes.ts for module route files', false)
    .option('--with-tests', 'copy colocated module tests', false)
}

program
  .option('--cwd <dir>', 'host app directory', process.cwd())
  .option('-y, --yes', 'skip prompts', false)
  .option('--dry-run', 'print plan without writing', false)
  .option('--registry <dir>', 'local registry path (fixture testing)')
  .option('--overwrite', 'replace differing host files', false)

program
  .command('init')
  .description('Write adonia.json and install shared API core')
  .option('--wire', 'apply host aliases / provider / exception handler', false)
  .option('--skip-core', 'do not copy api + core packages', false)
  .option(
    '--scaffold',
    'install all feature modules with stubs + routes (implies --wire)',
    false
  )
  .action(async (_args, cmd) => {
    const flags = shared(cmd)
    const opts = cmd.opts() as { wire?: boolean; skipCore?: boolean; scaffold?: boolean }
    await runInit({
      ...flags,
      wire: Boolean(opts.wire),
      skipCore: Boolean(opts.skipCore),
      scaffold: Boolean(opts.scaffold),
    })
  })

addScaffoldOptions(
  program
    .command('add')
    .description('Add one or more modules from the registry')
    .argument('[names...]', 'module names')
    .option('--overwrite', 'replace differing host files', false)
).action(async (names: string[], _opts, cmd) => {
  const flags = shared(cmd)
  const opts = cmd.opts() as Record<string, unknown>
  await runAdd(names, {
    ...flags,
    overwrite: flags.overwrite || Boolean(opts.overwrite),
    ...scaffoldFromOpts(opts),
  })
})

program
  .command('list')
  .description('List registry modules and install status')
  .action(async (_args, cmd) => {
    await runList(shared(cmd))
  })

addScaffoldOptions(
  program
    .command('diff')
    .description('Diff host files against the registry (module files; stubs only with --with-*)')
    .argument('[name]', 'module name')
).action(async (name: string | undefined, _opts, cmd) => {
  const flags = shared(cmd)
  const opts = cmd.opts() as Record<string, unknown>
  await runDiff(name, { ...flags, ...scaffoldFromOpts(opts) })
})

program
  .command('check')
  .description('Validate host modules install')
  .option('--strict', 'treat warnings as failures', false)
  .action(async (_args, cmd) => {
    const flags = shared(cmd)
    const opts = cmd.opts() as { strict?: boolean }
    await runCheck({ ...flags, strict: Boolean(opts.strict) })
  })

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
