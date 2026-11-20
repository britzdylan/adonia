/**
 * Runs one piece of work per item (for example one email per user) and
 * keeps going when an item fails. For scheduled jobs that fan out.
 *
 * Give the job that calls it no automatic retries: a retry would repeat the
 * items that already succeeded.
 */

/** What the handler did with one item. */
export type BatchOutcome = 'done' | 'skipped'

export type BatchSummary = { done: number; skipped: number; failed: number }

export type BatchOptions<T> = {
  /** Called for each item that throws. The batch continues. */
  onError?: (item: T, error: unknown) => void
}

export async function runBatch<T>(
  items: Iterable<T> | AsyncIterable<T>,
  handler: (item: T) => Promise<BatchOutcome>,
  options: BatchOptions<T> = {}
): Promise<BatchSummary> {
  const summary: BatchSummary = { done: 0, skipped: 0, failed: 0 }
  for await (const item of items) {
    try {
      const outcome = await handler(item)
      summary[outcome]++
    } catch (error) {
      summary.failed++
      options.onError?.(item, error)
    }
  }
  return summary
}

/**
 * Registers a recurring schedule at boot without letting a failure stop the
 * app (for example the queue store is down). Use a fixed schedule id in
 * `register`, so each boot updates the one schedule instead of adding one.
 *
 * @example
 * await registerScheduleSafely('weekly-digest', () =>
 *   SendDigests.schedule({}).id('weekly-digest').cron('0 9 * * 1').run(),
 *   (name, err) => logger.error({ err }, `Could not register ${name}`))
 */
export async function registerScheduleSafely(
  name: string,
  register: () => Promise<unknown>,
  onError: (name: string, error: unknown) => void
): Promise<boolean> {
  try {
    await register()
    return true
  } catch (error) {
    onError(name, error)
    return false
  }
}
