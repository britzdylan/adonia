import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
    firstName: vine.string().optional(),
    lastName: vine.string().optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)

export const activateValidator = vine.compile(
  vine.object({
    token: vine.string(),
  })
)

export const requestPasswordResetValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
  })
)

export const updatePasswordValidator = vine.compile(
  vine.object({
    token: vine.string(),
    password: vine.string().minLength(8),
  })
)
