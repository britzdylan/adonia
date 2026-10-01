import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

type Options = {
  table: string
  column: string
}

async function unique(value: unknown, options: Options, field: FieldContext) {
  if (typeof value !== 'string') {
    return
  }

  const db = (await import('@adonisjs/lucid/services/db')).default
  const row = await db.from(options.table).where(options.column, value).first()
  if (row) {
    field.report('The {{ field }} has already been taken', 'unique', field)
  }
}

export const uniqueRule = vine.createRule(unique)
