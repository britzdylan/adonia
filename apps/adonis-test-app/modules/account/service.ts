/**
 * AccountService
 *
 * Authenticated account actions: profile, email, password, delete.
 * Returns DTOs / void; controllers build HTTP envelopes.
 */
import encryption from '@adonisjs/core/services/encryption'
import ApiService from '#modules/api/service'
import ApiException from '#modules/api/exception'
import { exceptions } from '#constants/exceptions'
import type { User, UserStore } from '#modules/contracts/index'
import type {
  AvatarStorage,
  ReplaceEmailInput,
  ReplacePasswordInput,
  UpdateProfileInput,
} from '#modules/account/contracts/index'
import { defaultAccountOptions, type AccountOptions } from '#modules/account/options'
import '#modules/account/events'

const noopAvatars: AvatarStorage = {
  async delete() {},
}

export class AccountService extends ApiService {
  namespace = 'account'

  constructor(
    private users: UserStore,
    private avatars: AvatarStorage = noopAvatars,
    private options: AccountOptions = defaultAccountOptions
  ) {
    super()
  }

  private invalidTokenException() {
    return ApiException.from(exceptions.INVALID_TOKEN)
  }

  private tokensMatch(incoming: string, stored: string): boolean {
    const storedToken = encryption.decrypt(stored)
    return encryption.decrypt(incoming) === storedToken && storedToken != null
  }

  private issuePendingEmailToken(user: User, pendingEmail: string): User {
    return {
      ...user,
      pendingEmail,
      emailVerificationToken: encryption.encrypt(pendingEmail, this.options.emailChangeTtl),
    }
  }

  public async updateProfile(userId: number, data: UpdateProfileInput): Promise<User> {
    const user = await this.users.findOrFail(userId)
    const previousAvatarKey = user.avatarKey

    if (data.firstName !== undefined) {
      user.firstName = data.firstName
    }
    if (data.lastName !== undefined) {
      user.lastName = data.lastName
    }
    if (data.avatarKey !== undefined) {
      user.avatarKey = data.avatarKey
    }

    const saved = await this.users.save(user)

    if (
      data.avatarKey !== undefined &&
      previousAvatarKey &&
      previousAvatarKey !== data.avatarKey
    ) {
      await this.avatars.delete(previousAvatarKey)
    }

    this.emitSafe('Account:UpdateUserProfile', saved)
    return saved
  }

  /**
   * Stages a new email on pendingEmail. Current email stays valid until
   * confirmEmailChange succeeds.
   */
  public async replaceEmail(userId: number, data: ReplaceEmailInput): Promise<User> {
    const user = await this.users.findOrFail(userId)

    if (user.email === data.email) {
      throw ApiException.from(exceptions.SAME_EMAIL)
    }

    const existing = await this.users.findByEmail(data.email)
    if (existing) {
      throw ApiException.from(exceptions.EMAIL_EXISTS)
    }

    const updated = await this.users.save(this.issuePendingEmailToken(user, data.email))

    this.emitSafe('Account:UpdateUserEmail', {
      user: updated,
      newEmail: data.email,
    })

    return updated
  }

  /**
   * Confirms a pending email change using the verification token.
   */
  public async confirmEmailChange(token: string): Promise<User> {
    const user = await this.users.findByVerificationToken(token)
    if (!user || !user.pendingEmail) {
      throw this.invalidTokenException()
    }
    if (!user.emailVerificationToken || !this.tokensMatch(token, user.emailVerificationToken)) {
      throw this.invalidTokenException()
    }

    const taken = await this.users.findByEmail(user.pendingEmail)
    if (taken && taken.id !== user.id) {
      throw ApiException.from(exceptions.EMAIL_EXISTS)
    }

    const confirmed = await this.users.save({
      ...user,
      email: user.pendingEmail,
      pendingEmail: null,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    })

    this.emitSafe('Account:ConfirmEmailChange', confirmed)
    return confirmed
  }

  public async replacePassword(userId: number, data: ReplacePasswordInput): Promise<void> {
    const user = await this.users.findOrFail(userId)
    const valid = await this.users.verifyPassword(userId, data.currentPassword)
    if (!valid) {
      throw ApiException.from(exceptions.INVALID_PASSWORD)
    }

    await this.users.updatePassword(user, data.newPassword)
    this.emitSafe('Account:UpdateUserPassword', user)
  }

  public async deleteAccount(userId: number): Promise<void> {
    const user = await this.users.findOrFail(userId)
    if (user.avatarKey) {
      await this.avatars.delete(user.avatarKey)
    }
    await this.users.delete(userId)
    this.emitSafe('Account:DeleteAccount', { userId })
  }
}
