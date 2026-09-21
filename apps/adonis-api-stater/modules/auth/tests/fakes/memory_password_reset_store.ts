import type { User } from '#modules/contracts/index'
import type {
  AuthPasswordReset,
  PasswordResetStore,
  TokenDuration,
} from '#modules/auth/contracts/index'
import type { MemoryUserStore } from '#modules/adapters/tests/memory_user_store'

/**
 * In-memory PasswordResetStore. createForUser deletes prior rows for the user.
 */
export class MemoryPasswordResetStore implements PasswordResetStore {
  rows = new Map<number, AuthPasswordReset>()
  byToken = new Map<string, AuthPasswordReset>()
  nextId = 1
  createCalls: number[] = []

  constructor(private users?: MemoryUserStore) {}

  async createForUser(userId: number, _duration: TokenDuration): Promise<AuthPasswordReset> {
    this.createCalls.push(userId)
    await this.deleteForUser(userId)
    const row: AuthPasswordReset = {
      id: this.nextId++,
      userId,
      token: `reset-${userId}-${this.nextId}`,
      isExpired: false,
    }
    this.rows.set(row.id, row)
    this.byToken.set(row.token, row)
    return { ...row }
  }

  async findByToken(token: string): Promise<AuthPasswordReset | null> {
    const row = this.byToken.get(token)
    return row ? { ...row } : null
  }

  async deleteForUser(userId: number): Promise<void> {
    for (const [id, row] of this.rows) {
      if (row.userId === userId) {
        this.rows.delete(id)
        this.byToken.delete(row.token)
      }
    }
  }

  async refreshToken(
    reset: AuthPasswordReset,
    _duration: TokenDuration
  ): Promise<AuthPasswordReset> {
    const existing = this.rows.get(reset.id)
    if (!existing) throw new Error('reset not found')
    this.byToken.delete(existing.token)
    const refreshed: AuthPasswordReset = {
      ...existing,
      token: `refreshed-${existing.id}`,
      isExpired: false,
    }
    this.rows.set(refreshed.id, refreshed)
    this.byToken.set(refreshed.token, refreshed)
    return { ...refreshed }
  }

  async findUserByReset(reset: AuthPasswordReset): Promise<User> {
    if (!this.users) {
      throw new Error('MemoryPasswordResetStore requires a MemoryUserStore for findUserByReset')
    }
    return this.users.findOrFail(reset.userId)
  }
}
