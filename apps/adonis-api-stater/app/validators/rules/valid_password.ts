import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

function validPassword(value: unknown, _options: undefined, field: FieldContext) {
  if (typeof value !== 'string') {
    return
  }

  const ok =
    value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value)
  if (!ok) {
    field.report(
      'The {{ field }} must be at least 8 characters and contain uppercase, lowercase, and a number',
      'validPassword',
      field
    )
  }
}

export const validPasswordRule = vine.createRule(validPassword)
