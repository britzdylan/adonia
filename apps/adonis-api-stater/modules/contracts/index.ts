/**
 * Shared module contracts (cross-cutting ports).
 * Module-specific contracts stay under modules/<name>/contracts.
 */
export type { AuthMethod, User, PublicUser, RegisterUserInput, UserStore } from './user.ts'
export { toPublicUser } from './user.ts'
