/**
 * Lucid PasswordResetStore. Copied to app/adapters/lucid_password_reset_store.ts.
 * Expects PasswordReset at #models/password_reset with userId, token, expiresAt,
 * and a belongsTo user relation.
 */
import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'
import encryption from '@adonisjs/core/services/encryption'
import PasswordReset from '#models/password_reset'
import { toUser } from './map_user.ts'
import { defaultAuthOptions } from '#modules/auth/options'
import type { User } from '#modules/contracts/index'
import type {
  AuthPasswordReset,
  PasswordResetStore,
  TokenDuration,
} from '#modules/auth/contracts/index'

export class LucidPasswordResetStore implements PasswordResetStore {
  constructor(private tokenBytes = defaultAuthOptions.passwordResetTokenBytes) {}

  private toAuthPasswordReset(row: PasswordReset): AuthPasswordReset {
    return {
      id: row.id,
      userId: row.userId,
      token: row.token,
      isExpired: row.expiresAt.toMillis() < DateTime.now().toMillis(),
    }
  }

  private applyToken(row: PasswordReset, duration: TokenDuration) {
    row.token = encryption.encrypt(string.generateRandom(this.tokenBytes))
    row.expiresAt = DateTime.now().plus(duration)
  }

  async createForUser(userId: number, duration: TokenDuration): Promise<AuthPasswordReset> {
    await this.deleteForUser(userId)
    const row = new PasswordReset()
    row.userId = userId
    this.applyToken(row, duration)
    await row.save()
    return this.toAuthPasswordReset(row)
  }

  async findByToken(token: string): Promise<AuthPasswordReset | null> {
    const row = await PasswordReset.findBy('token', token)
    return row ? this.toAuthPasswordReset(row) : null
  }

  async deleteForUser(userId: number): Promise<void> {
    await PasswordReset.query().where('user_id', userId).delete()
  }

  async refreshToken(
    reset: AuthPasswordReset,
    duration: TokenDuration
  ): Promise<AuthPasswordReset> {
    const row = await PasswordReset.findOrFail(reset.id)
    this.applyToken(row, duration)
    await row.save()
    return this.toAuthPasswordReset(row)
  }

  async findUserByReset(reset: AuthPasswordReset): Promise<User> {
    const row = await PasswordReset.query().where('id', reset.id).preload('user').firstOrFail()
    return toUser(row.user)
  }
}
