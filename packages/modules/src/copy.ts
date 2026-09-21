import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type CopyResult = 'copied' | 'skipped' | 'conflict' | 'would-copy' | 'would-skip' | 'would-conflict'

export interface CopyOptions {
  overwrite?: boolean
  dryRun?: boolean
}

export function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function copyFileWithPolicy(
  src: string,
  dest: string,
  options: CopyOptions = {}
): CopyResult {
  const { overwrite = false, dryRun = false } = options
  const srcBuf = readFileSync(src)

  if (!existsSync(dest)) {
    if (dryRun) return 'would-copy'
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
    return 'copied'
  }

  const destBuf = readFileSync(dest)
  if (sha256(srcBuf) === sha256(destBuf)) {
    return dryRun ? 'would-skip' : 'skipped'
  }

  if (!overwrite) {
    return dryRun ? 'would-conflict' : 'conflict'
  }

  if (dryRun) return 'would-copy'
  writeFileSync(dest, srcBuf)
  return 'copied'
}

export function ensureDir(path: string, dryRun = false): void {
  if (dryRun) return
  mkdirSync(path, { recursive: true })
}
