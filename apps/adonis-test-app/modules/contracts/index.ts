/**
 * Shared module contracts (cross-cutting ports).
 * Module-specific contracts stay under modules/<name>/contracts.
 */
export type { AuthMethod, User, RegisterUserInput, UserStore } from './user.ts'
