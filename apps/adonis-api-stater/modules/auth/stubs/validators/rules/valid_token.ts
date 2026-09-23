import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

type Options = {
  table: string
  column: string
}

async function validToken(value: unknown, options: Options, field: FieldContext) {
  if (typeof value !== 'string') {
    return
  }

  const db = (await import('@adonisjs/lucid/services/db')).default
  const row = await db.from(options.table).where(options.column, value).first()
  if (!row) {
    field.report('The {{ field }} is invalid', 'validToken', field)
    return
  }

  const expiresAt = (row as { expires_at?: string | Date | null }).expires_at
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    field.report('The {{ field }} has expired', 'validToken', field)
  }
}

export const validTokenRule = vine.createRule(validToken)
