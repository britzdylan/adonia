/**
 * List helpers: page bounds, LIKE escaping, and the page result shape a
 * repository returns. No Lucid import: `toPageResult` takes anything with
 * Lucid's paginator shape (`all()` and `total`).
 */
import type { PaginationParams } from '#modules/types/api'

export type PageResult<T> = { rows: T[]; total: number }

export type PageBounds = {
  /** Page size when the request gives none. */
  defaultPageSize: number
  /** Largest page size a request may ask for. */
  maxPageSize: number
}

export const defaultPageBounds: PageBounds = {
  defaultPageSize: 25,
  maxPageSize: 100,
}

/**
 * Page and page size a query can use: integers, page at least 1, page size
 * between 1 and `maxPageSize`. Validate requests with the pagination Vine
 * stub as well; this is the last guard before the database.
 */
export function resolvePage(
  params: PaginationParams = {},
  bounds: PageBounds = defaultPageBounds
): Required<PaginationParams> {
  const page = Math.max(1, Math.floor(params.page ?? 1) || 1)
  const requested = Math.floor(params.pageSize ?? bounds.defaultPageSize) || bounds.defaultPageSize
  const pageSize = Math.min(bounds.maxPageSize, Math.max(1, requested))
  return { page, pageSize }
}

/**
 * Escapes `%`, `_` and `\` so a search term matches as typed, and wraps it
 * for a "contains" match. Use with the escape character `\`: Postgres and
 * MySQL use it by default; SQLite needs `ESCAPE '\'` in the query.
 *
 * @example
 * query.whereILike('name', containsPattern(search))
 */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

/** Lucid's `query.paginate()` result → `{ rows, total }`. */
export function toPageResult<T>(paginator: { all(): T[]; total: number }): PageResult<T> {
  return { rows: paginator.all(), total: paginator.total }
}
