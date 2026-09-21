/**
 * Auth module contracts.
 * Shared User / UserStore: #modules/contracts
 */
export type {
  AuthPasswordReset,
  LoginCredentials,
  LoginResult,
  UpdatePasswordInput,
  TokenDuration,
  SessionResult,
} from './types.ts'

export type { PasswordResetStore } from './password_reset_store.ts'
export type { SessionManager } from './session_manager.ts'

/** Re-export shared user port for convenience inside the auth module. */
export type { AuthMethod, User, RegisterUserInput, UserStore } from '#modules/contracts/index'
