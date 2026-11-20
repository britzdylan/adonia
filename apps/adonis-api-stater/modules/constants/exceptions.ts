import type { StatusCodeEntry } from '#modules/types/constants'

/**
 * Exception codes for modules + documented host-facing codes.
 * Hosts extend via defineCodes in app/constants/.
 *
 * Host-facing (not thrown by a module service today):
 * - INVALID_CREDENTIALS, UNAUTHENTICATED, SESSION_EXPIRED — auth middleware
 * - FORBIDDEN — authorization failures
 * - TOO_MANY_ATTEMPTS, TOO_MANY_REQUESTS — rate limiting
 * - PAYLOAD_TOO_LARGE — file upload limits (HTTP 413)
 * - VALIDATION_ERROR — the API exception handler, for Vine messages that are not codes
 */
export const exceptions = {
  INVALID_CREDENTIALS: {
    status: 401,
    code: 'E_INVALID_CREDENTIALS',
  },
  UNAUTHENTICATED: {
    status: 401,
    code: 'E_UNAUTHENTICATED',
  },
  SESSION_EXPIRED: {
    status: 401,
    code: 'E_SESSION_EXPIRED',
  },
  ACCOUNT_UNVERIFIED: {
    status: 403,
    code: 'E_ACCOUNT_UNVERIFIED',
  },
  FORBIDDEN: {
    status: 403,
    code: 'E_FORBIDDEN',
  },
  SAME_EMAIL: {
    status: 400,
    code: 'E_SAME_EMAIL',
  },
  INVALID_PASSWORD: {
    status: 400,
    code: 'E_INVALID_PASSWORD',
  },
  INVALID_TOKEN: {
    status: 400,
    code: 'E_INVALID_TOKEN',
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    code: 'E_PAYLOAD_TOO_LARGE',
  },
  EMAIL_EXISTS: {
    status: 409,
    code: 'E_EMAIL_EXISTS',
  },
  TOO_MANY_ATTEMPTS: {
    status: 429,
    code: 'E_TOO_MANY_ATTEMPTS',
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    code: 'E_TOO_MANY_REQUESTS',
  },
  VALIDATION_ERROR: {
    status: 422,
    code: 'E_VALIDATION_ERROR',
  },
  NOTIFICATION_NOT_FOUND: {
    status: 404,
    code: 'E_NOTIFICATION_NOT_FOUND',
  },
  ACCOUNT_CLOSURE_FAILED: {
    status: 502,
    code: 'E_ACCOUNT_CLOSURE_FAILED',
  },
} as const satisfies Record<string, StatusCodeEntry>

export type ExceptionKey = keyof typeof exceptions
