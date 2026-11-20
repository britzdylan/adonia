import { Exception } from '@adonisjs/core/exceptions'
import type { StatusCodeEntry } from '#modules/types/constants'

type ApiExceptionOptions = {
  status?: number
  code?: string
  message?: string
  cause?: unknown
  /**
   * Extra details the client needs next to the code (for example a
   * host-defined message to show). Rendered as `data` on the failure
   * envelope. Never put secrets or internal state here.
   */
  data?: unknown
}

/**
 * Domain exception carrier. No custom handle() — the API exception handler
 * formats every error (framework + ApiException) through one JSON envelope.
 *
 * @example
 * throw new ApiException('E_INVALID_TOKEN', { status: 400 })
 * throw ApiException.from(exceptions.INVALID_TOKEN)
 * throw ApiException.withData(exceptions.FORBIDDEN, { reason: 'paused' })
 */
export default class ApiException extends Exception {
  /** Rendered as `data` on the failure envelope when set. */
  readonly data?: unknown

  constructor(code: string, options: ApiExceptionOptions = {}) {
    super(options.message ?? code, {
      status: options.status ?? 400,
      code,
      cause: options.cause,
    })
    if (options.data !== undefined) {
      this.data = options.data
    }
  }

  /**
   * Build from a modules/constants exceptions entry.
   */
  static from(entry: StatusCodeEntry, cause?: unknown) {
    return new ApiException(entry.code, {
      status: entry.status,
      code: entry.code,
      cause,
    })
  }

  /**
   * Build from a catalog entry and attach details for the client. The
   * envelope `message` stays the code, so clients can still branch on it.
   */
  static withData(entry: StatusCodeEntry, data: unknown, cause?: unknown) {
    return new ApiException(entry.code, {
      status: entry.status,
      code: entry.code,
      cause,
      data,
    })
  }
}
