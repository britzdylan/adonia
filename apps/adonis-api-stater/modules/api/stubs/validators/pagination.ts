/**
 * Shared list-query fields. Copied to app/validators/pagination.ts.
 * Spread into a list validator so every list has the same bounds:
 *
 * export const listFormsValidator = vine.create(
 *   vine.object({ ...paginationFields, status: vine.string().optional() })
 * )
 */
import vine from '@vinejs/vine'

export const paginationFields = {
  page: vine.number().withoutDecimals().min(1).max(100_000).optional(),
  pageSize: vine.number().withoutDecimals().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(200).optional(),
}
