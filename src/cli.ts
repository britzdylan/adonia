#!/usr/bin/env node
import { Command } from 'commander'
import { resolve } from 'node:path'
import { runAdd } from './commands/add.js'
import { runCheck } from './commands/check.js'
import { runDiff } from './commands/diff.js'
import { runInit } from './commands/init.js'
import { runList } from './commands/list.js'
import { packageVersion } from './host.js'
import type { SharedFlags } from './types.js'

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
  .action(async (_args, cmd) => {
    const flags = shared(cmd)
    const opts = cmd.opts() as { wire?: boolean; skipCore?: boolean }
    await runInit({ ...flags, wire: Boolean(opts.wire), skipCore: Boolean(opts.skipCore) })
  })

program
  .command('add')
  .description('Add one or more modules from the registry')
  .argument('[names...]', 'module names')
  .option('--skip-stubs', 'do not copy stubs into app/', false)
  .option('--with-tests', 'copy colocated module tests', false)
  .option('--overwrite', 'replace differing host files', false)
  .action(async (names: string[], _opts, cmd) => {
    const flags = shared(cmd)
    const opts = cmd.opts() as { skipStubs?: boolean; withTests?: boolean; overwrite?: boolean }
    await runAdd(names, {
      ...flags,
      overwrite: flags.overwrite || Boolean(opts.overwrite),
      skipStubs: Boolean(opts.skipStubs),
      withTests: Boolean(opts.withTests),
    })
  })

program
  .command('list')
  .description('List registry modules and install status')
  .action(async (_args, cmd) => {
    await runList(shared(cmd))
  })

program
  .command('diff')
  .description('Diff host files against the registry')
  .argument('[name]', 'module name')
  .action(async (name: string | undefined, _opts, cmd) => {
    await runDiff(name, shared(cmd))
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
