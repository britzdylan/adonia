/**
 * Shared user port — used by auth, account, and any future user-facing module.
 */

export type AuthMethod = 'email' | 'github' | 'google'

/**
 * Portable user DTO. Host adapters map persistence models ↔ this shape.
 */
export type User = {
  id: number
  email: string
  /** Staged email awaiting confirmation; current email stays valid until then. */
  pendingEmail: string | null
  authMethod: AuthMethod
  firstName: string
  lastName: string
  avatarKey: string | null
  emailVerifiedAt: Date | null
  emailVerificationToken: string | null
}

/**
 * Input for creating an email-auth user via UserStore.createEmailUser.
 */
export type RegisterUserInput = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  fullName?: string | null
}

/**
 * Host must implement this. Auth/Account services talk only to this contract.
 * Persistence, hashing, and schema details stay in the host adapter.
 */
export interface UserStore {
  /**
   * Persist a new email-auth user (hash password).
   * Do not set emailVerifiedAt or verification token — the service owns that flow.
   */
  createEmailUser(data: RegisterUserInput): Promise<User>

  findOrFail(id: number): Promise<User>

  findByEmail(email: string): Promise<User | null>

  findByEmailOrFail(email: string): Promise<User>

  findByVerificationToken(token: string): Promise<User | null>

  /**
   * Verify email/password. Throw a framework/auth error on failure
   * (mapped by the global exception handler).
   */
  verifyCredentials(email: string, password: string): Promise<User>

  /**
   * Verify a stored password for an existing user (no login).
   */
  verifyPassword(userId: number, password: string): Promise<boolean>

  /**
   * Persist User field changes (verification token, emailVerifiedAt, profile, …).
   */
  save(user: User): Promise<User>

  /**
   * Hash and persist a new password for the user.
   */
  updatePassword(user: User, password: string): Promise<User>

  /**
   * Permanently delete the user row.
   */
  delete(userId: number): Promise<void>
}
