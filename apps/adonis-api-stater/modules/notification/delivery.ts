/**
 * Email delivery tracking.
 *
 * A queued email reaches the sender only as a compiled message, so the
 * record it belongs to travels in a header (`DELIVERY_REF_HEADER`). The
 * messenger reads it back and tells the host's MailDeliveryTracker whether
 * the send worked.
 *
 * Set the header in a mail class:
 *
 *   prepare() {
 *     this.message.header(DELIVERY_REF_HEADER, `order:${this.order.id}`)
 *   }
 *
 * No @adonisjs/mail import: the messenger works with anything that has
 * `sendCompiled`. The notification stub `start/mail_delivery.ts` installs it.
 */
import type { MailDeliveryTracker } from '#modules/notification/contracts/index'

export const DELIVERY_REF_HEADER = 'X-Delivery-Ref'

/** The delivery reference from a compiled message's headers, if it has one. */
export function deliveryRefFromHeaders(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return null
  for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
    if (name.toLowerCase() !== DELIVERY_REF_HEADER.toLowerCase()) continue
    return typeof value === 'string' && value !== '' ? value : null
  }
  return null
}

export type TrackedSendOptions = {
  /** Total attempts, first included. Default 3. */
  attempts?: number
  /** Wait before attempt n (1-based retry number). Default 1 s, 4 s, 9 s, … */
  backoffMs?: (retry: number) => number
  /** Tracker or send errors that must not stop the caller. */
  onError?: (error: unknown, ref: string | null) => void
  /** For tests. */
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Runs `send` with retries, then records the result when `ref` is set.
 * Throws the last error when every attempt failed. A tracker error is
 * reported to `onError` and never causes the email to be sent again.
 */
export async function sendTracked(
  send: () => Promise<unknown>,
  ref: string | null,
  tracker: MailDeliveryTracker | null,
  options: TrackedSendOptions = {}
): Promise<void> {
  const attempts = Math.max(1, options.attempts ?? 3)
  const backoff = options.backoffMs ?? ((retry: number) => retry * retry * 1000)
  const sleep = options.sleep ?? defaultSleep
  const now = options.now ?? (() => new Date())

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) await sleep(backoff(attempt - 1))
    try {
      await send()
      if (ref && tracker) await record(() => tracker.sent(ref, now()), ref, options)
      return
    } catch (error) {
      lastError = error
    }
  }

  if (ref && tracker) {
    const message = lastError instanceof Error ? lastError.message : String(lastError)
    await record(() => tracker.failed(ref, message), ref, options)
  }
  throw lastError
}

async function record(write: () => Promise<void>, ref: string, options: TrackedSendOptions) {
  try {
    await write()
  } catch (error) {
    options.onError?.(error, ref)
  }
}

/** What a mailer must offer the messenger: Adonis Mail's `sendCompiled`. */
export type CompiledMailSender<M extends { message: { headers?: unknown } }> = {
  sendCompiled(mail: M, sendConfig?: unknown): Promise<unknown>
}

/**
 * A messenger for `mail.setMessenger(...)`. `sendLater` returns at once; the
 * email is sent in the background with retries and its delivery recorded.
 * Mail is kept in memory, so it is lost if the process stops: use a job
 * queue with `sendTracked` when that matters.
 */
export function createTrackedMessenger<M extends { message: { headers?: unknown } }>(
  mailer: CompiledMailSender<M>,
  tracker: MailDeliveryTracker | null,
  options: TrackedSendOptions = {}
) {
  return {
    async queue(mail: M, sendConfig?: unknown): Promise<void> {
      const ref = deliveryRefFromHeaders(mail.message.headers)
      sendTracked(() => mailer.sendCompiled(mail, sendConfig), ref, tracker, options).catch(
        (error) => options.onError?.(error, ref)
      )
    },
  }
}
