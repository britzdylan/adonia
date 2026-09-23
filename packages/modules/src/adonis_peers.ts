import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AdonisPeer {
  pkg: string
  reason: string
  /** Host-relative path that means this Adonis kit is actually in use. */
  whenFile?: string
}

/** Adonis kits we assume are configured, or we tell the host to `ace add`. */
export const ADONIS_PEERS: Record<string, AdonisPeer[]> = {
  auth: [
    {
      pkg: '@adonisjs/limiter',
      reason: 'rate-limit auth routes',
      whenFile: 'start/limiter.ts',
    },
  ],
  account: [
    {
      pkg: '@adonisjs/drive',
      reason: 'avatar file cleanup',
      whenFile: 'app/adapters/drive_avatar_storage.ts',
    },
  ],
  notification: [
    {
      pkg: '@adonisjs/mail',
      reason: 'email notification channel',
      whenFile: 'app/adapters/adonis_mail_transport.ts',
    },
  ],
}

export function hostPackageNames(cwd: string): Set<string> {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) return new Set()
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ])
}

export function missingAdonisPeers(
  cwd: string,
  moduleName: string,
  opts?: { plannedFiles?: Iterable<string> }
): AdonisPeer[] {
  const have = hostPackageNames(cwd)
  const planned = new Set(opts?.plannedFiles ?? [])
  return (ADONIS_PEERS[moduleName] ?? []).filter((peer) => {
    if (have.has(peer.pkg)) return false
    if (peer.whenFile) {
      const dest = join(cwd, peer.whenFile)
      if (!planned.has(dest) && !existsSync(dest)) return false
    }
    return true
  })
}

export function aceAddHint(pkg: string): string {
  return `node ace add ${pkg}`
}

export function formatMissingPeer(peer: AdonisPeer): string {
  return `Missing ${peer.pkg} (${peer.reason}). Run: ${aceAddHint(peer.pkg)}`
}
