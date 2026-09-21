import type { User } from '#modules/contracts/index'

/**
 * Result of opening a session. Access-token hosts return token + expiry;
 * cookie hosts may return {}.
 */
export type SessionResult = {
  token?: string
  expiresAt?: Date
}

/**
 * Host HTTP/session (or access-token) bridge.
 * Controllers pass an implementation; AuthService stays HTTP-free.
 */
export interface SessionManager {
  login(user: User): Promise<SessionResult>
  logout(): Promise<void>
}
