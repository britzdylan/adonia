import { Exception } from '@adonisjs/core/exceptions'
import type { StatusCodeEntry } from '#modules/types/constants'

type ApiExceptionOptions = {
  status?: number
  code?: string
  message?: string
  cause?: unknown
}

/**
 * Domain exception carrier. No custom handle() — the API exception handler
 * formats every error (framework + ApiException) through one JSON envelope.
 *
 * @example
 * throw new ApiException('E_INVALID_TOKEN', { status: 400 })
 * throw ApiException.from(exceptions.INVALID_TOKEN)
 */
export default class ApiException extends Exception {
  constructor(code: string, options: ApiExceptionOptions = {}) {
    super(options.message ?? code, {
      status: options.status ?? 400,
      code,
      cause: options.cause,
    })
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
}
