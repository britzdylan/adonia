import vine from '@vinejs/vine'

export const updateProfileValidator = vine.compile(
  vine.object({
    firstName: vine.string().optional(),
    lastName: vine.string().optional(),
    avatarKey: vine.string().nullable().optional(),
  })
)

export const replaceEmailValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
  })
)

export const confirmEmailChangeValidator = vine.compile(
  vine.object({
    token: vine.string(),
  })
)

export const replacePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newPassword: vine.string().minLength(8),
  })
)
