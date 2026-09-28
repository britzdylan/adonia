import vine from '@vinejs/vine'

export const updateProfileValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().maxLength(80).optional(),
    lastName: vine.string().trim().maxLength(80).optional(),
    avatarKey: vine.string().nullable().optional(),
  })
)

export const replaceEmailValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().unique({ table: 'users', column: 'email' }),
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
    newPassword: vine.string().validPassword().confirmed(),
  })
)

export const updateNotificationsValidator = vine.compile(
  vine.object({
    emailMarketing: vine.boolean().optional(),
    emailProductUpdates: vine.boolean().optional(),
    emailSecurityAlerts: vine.boolean().optional(),
    emailWeeklyDigest: vine.boolean().optional(),
  })
)
