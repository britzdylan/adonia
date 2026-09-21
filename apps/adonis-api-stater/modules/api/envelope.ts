/**
 * Runtime helpers for the shared API envelope.
 * Types live in modules/types/api.ts.
 */
import type {
  ApiErrorBody,
  ApiResponse,
  ApiResult,
  PaginatedResponse,
} from '#modules/types/api'

/**
 * Build the shared failure envelope used by ApiService and the exception handler.
 */
export function prepareError(message: string, status?: number): ApiErrorBody {
  return {
    success: false,
    message,
    ...(status !== undefined && { status }),
  }
}

export function isApiError(
  result: unknown
): result is Extract<ApiResult<never>, { success: false }> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    (result as { success: unknown }).success === false &&
    'message' in result
  )
}

/**
 * Paginated envelopes carry `meta`. Checked before isApiResponse so a
 * PaginatedResponse is not treated as a plain ApiResponse.
 */
export function isPaginatedResponse(result: unknown): result is PaginatedResponse<unknown> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    (result as { success: unknown }).success === true &&
    'data' in result &&
    'message' in result &&
    'meta' in result &&
    typeof (result as { meta: unknown }).meta === 'object' &&
    (result as { meta: unknown }).meta !== null &&
    'total' in (result as { meta: object }).meta &&
    'page' in (result as { meta: object }).meta &&
    'pageSize' in (result as { meta: object }).meta &&
    'totalPages' in (result as { meta: object }).meta
  )
}

export function isApiResponse(result: unknown): result is ApiResponse<unknown> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    (result as { success: unknown }).success === true &&
    'data' in result &&
    'message' in result
  )
}
