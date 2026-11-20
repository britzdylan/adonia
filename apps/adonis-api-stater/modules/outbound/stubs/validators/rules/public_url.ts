/**
 * Vine rule: a URL the server may call. Copied to
 * app/validators/rules/public_url.ts.
 *
 * Rejects a URL that is not http(s), does not resolve, or resolves to a
 * private or internal address. It runs the same check as
 * `sendOutboundRequest`, so a user sees the problem when they save the URL,
 * not as a failed delivery later.
 *
 * Reports `E_VALIDATION_ERROR_UNSAFE_URL`, which the API exception handler
 * passes through as the envelope `message`.
 *
 * @example
 * url: vine.string().url().use(publicUrlRule({ allowPrivate: env.get('OUTBOUND_ALLOW_PRIVATE_URLS') }))
 */
import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import { assertPublicUrl, UnsafeUrlError } from '#modules/outbound/url_safety'

export type PublicUrlOptions = {
  /** Skip the check (local development and tests only). */
  allowPrivate?: boolean
}

async function publicUrl(
  value: unknown,
  options: PublicUrlOptions | undefined,
  field: FieldContext
) {
  if (typeof value !== 'string' || !field.isValid) return
  if (options?.allowPrivate === true) return

  try {
    await assertPublicUrl(value)
  } catch (error) {
    if (!(error instanceof UnsafeUrlError)) throw error
    field.report('E_VALIDATION_ERROR_UNSAFE_URL', 'publicUrl', field)
  }
}

export const publicUrlRule = vine.createRule(publicUrl, { isAsync: true })
