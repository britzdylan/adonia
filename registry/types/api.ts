/**
 * Shared API response envelope types for the starter core.
 * Runtime helpers live in modules/api/envelope.ts.
 *
 * Controllers (and hosts) build these envelopes. Domain services return DTOs.
 */

export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T
  message: string | null
  success: boolean
  meta?: PaginationMeta
}

export type ApiErrorBody = {
  success: false
  message: string
  status?: number
  errors?: unknown
}

export type ApiResult<T> =
  | { success: true; data: T; message: string | null; meta?: PaginationMeta }
  | ApiErrorBody

/**
 * Paginated success envelope — same shape as ApiResponse with required meta.
 */
export type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta }

export interface PaginationParams {
  page?: number
  pageSize?: number
}
