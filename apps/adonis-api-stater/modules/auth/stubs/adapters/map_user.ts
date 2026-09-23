import type UserModel from '#models/user'
import type { User } from '#modules/contracts/index'

/**
 * Map a Lucid User row to the portable User DTO.
 */
export function toUser(user: UserModel): User {
  return {
    id: user.id,
    email: user.email,
    pendingEmail: user.pendingEmail ?? null,
    authMethod: user.authMethod,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarKey: user.avatarKey ?? null,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toJSDate() : null,
    emailVerificationToken: user.emailVerificationToken,
  }
}
