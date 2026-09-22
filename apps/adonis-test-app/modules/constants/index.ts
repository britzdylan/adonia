import type { StatusCodeEntry } from '#modules/types/constants'

export { exceptions } from './exceptions.ts'
export { responseCodes } from './responseCodes.ts'

/**
 * Typed helper so hosts get the same `as const satisfies` ergonomics when
 * extending catalogs in app/constants/.
 */
export function defineCodes<T extends Record<string, StatusCodeEntry>>(codes: T): T {
  return codes
}
