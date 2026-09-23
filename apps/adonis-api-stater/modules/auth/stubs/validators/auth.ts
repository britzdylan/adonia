import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().unique({ table: 'users', column: 'email' }),
    password: vine.string().validPassword().confirmed(),
    firstName: vine.string().trim().maxLength(80).optional(),
    lastName: vine.string().trim().maxLength(80).optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string(),
  })
)

export const activateValidator = vine.compile(
  vine.object({
    token: vine.string(),
  })
)

export const resendActivationValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().exists({ table: 'users', column: 'email' }),
  })
)

export const requestPasswordResetValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().exists({ table: 'users', column: 'email' }),
  })
)

export const validatePasswordResetValidator = vine.compile(
  vine.object({
    token: vine.string().validToken({ table: 'password_resets', column: 'token' }),
  })
)

export const updatePasswordValidator = vine.compile(
  vine.object({
    token: vine.string().validToken({ table: 'password_resets', column: 'token' }),
    password: vine.string().validPassword().confirmed(),
  })
)
