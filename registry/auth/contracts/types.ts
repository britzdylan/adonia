/**
 * Auth-only DTOs and input types.
 * Shared User / UserStore live in #modules/contracts.
 */
import type { User } from '#modules/contracts/index'
import type { SessionResult } from './session_manager.ts'

export type AuthPasswordReset = {
  id: number
  userId: number
  token: string
  isExpired: boolean
}

export type LoginCredentials = {
  email: string
  password: string
}

export type UpdatePasswordInput = {
  token: string
  password: string
}

export type TokenDuration = { hours: number } | { minutes: number }

export type { SessionResult }

export type LoginResult = {
  user: User
  session: SessionResult
}
