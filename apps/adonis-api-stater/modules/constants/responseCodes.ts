import type { StatusCodeEntry } from '#modules/types/constants'

/**
 * Success message codes for auth/account controllers.
 * Domain services do not import these — controllers build envelopes.
 */
export const responseCodes = {
  AUTH_LOGIN: {
    status: 200,
    code: 'M_AUTH_LOGIN',
  },
  AUTH_LOGOUT: {
    status: 200,
    code: 'M_AUTH_LOGOUT',
  },
  AUTH_REGISTER: {
    status: 201,
    code: 'M_AUTH_REGISTER',
  },
  AUTH_RESET_PASSWORD_REQUEST: {
    status: 200,
    code: 'M_AUTH_RESET_PASSWORD_REQUEST',
  },
  AUTH_UPDATE_PASSWORD: {
    status: 200,
    code: 'M_AUTH_UPDATE_PASSWORD',
  },
  AUTH_ACTIVATE_ACCOUNT_REQUEST: {
    status: 200,
    code: 'M_AUTH_ACTIVATE_ACCOUNT_REQUEST',
  },
  AUTH_ACTIVATE_ACCOUNT: {
    status: 200,
    code: 'M_AUTH_ACTIVATE_ACCOUNT',
  },
  AUTH_VALIDATE_PASSWORD_RESET: {
    status: 200,
    code: 'M_AUTH_VALIDATE_PASSWORD_RESET',
  },

  PROFILE_UPDATED: {
    status: 200,
    code: 'M_PROFILE_UPDATED',
  },
  EMAIL_VERIFICATION_SENT: {
    status: 200,
    code: 'M_EMAIL_VERIFICATION_SENT',
  },
  EMAIL_CHANGE_CONFIRMED: {
    status: 200,
    code: 'M_EMAIL_CHANGE_CONFIRMED',
  },
  PASSWORD_UPDATED: {
    status: 200,
    code: 'M_PASSWORD_UPDATED',
  },
  ACCOUNT_DELETED: {
    status: 200,
    code: 'M_ACCOUNT_DELETED',
  },
  USER_SHOW: {
    status: 200,
    code: 'M_USER_SHOW',
  },
  NOTIFICATIONS_FETCHED: {
    status: 200,
    code: 'M_NOTIFICATIONS_FETCHED',
  },
  NOTIFICATIONS_UPDATED: {
    status: 200,
    code: 'M_NOTIFICATIONS_UPDATED',
  },
  INBOX_FETCHED: {
    status: 200,
    code: 'M_INBOX_FETCHED',
  },
  INBOX_MARKED_READ: {
    status: 200,
    code: 'M_INBOX_MARKED_READ',
  },
  INBOX_MARKED_ALL_READ: {
    status: 200,
    code: 'M_INBOX_MARKED_ALL_READ',
  },
} as const satisfies Record<string, StatusCodeEntry>

export type ResponseCodeKey = keyof typeof responseCodes
