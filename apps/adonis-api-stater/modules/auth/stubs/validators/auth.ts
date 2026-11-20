import vine from '@vinejs/vine'

export const registerValidator = vine.create(
  vine.object({
    email: vine.string().email().normalizeEmail().unique({ table: 'users', column: 'email' }),
    password: vine.string().validPassword().confirmed(),
    firstName: vine.string().trim().maxLength(80).optional(),
    lastName: vine.string().trim().maxLength(80).optional(),
  })
)

export const loginValidator = vine.create(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string(),
  })
)

export const activateValidator = vine.create(
  vine.object({
    token: vine.string(),
  })
)

/**
 * No `exists` rule on the two "send me an email" validators: a different
 * response for an unknown address would tell anyone who has an account.
 * AuthService ignores unknown addresses instead.
 */
export const resendActivationValidator = vine.create(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)

export const requestPasswordResetValidator = vine.create(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)

export const validatePasswordResetValidator = vine.create(
  vine.object({
    token: vine.string().validToken({ table: 'password_resets', column: 'token' }),
  })
)

export const updatePasswordValidator = vine.create(
  vine.object({
    token: vine.string().validToken({ table: 'password_resets', column: 'token' }),
    password: vine.string().validPassword().confirmed(),
  })
)
