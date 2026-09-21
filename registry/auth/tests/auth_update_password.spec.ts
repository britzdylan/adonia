import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { AuthService } from '#modules/auth/service'
import type { User, UserStore } from '#modules/contracts/index'
import type {
  AuthPasswordReset,
  PasswordResetStore,
  TokenDuration,
} from '#modules/auth/contracts/index'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'user@test.com',
    pendingEmail: null,
    authMethod: 'email',
    firstName: 'Test',
    lastName: 'User',
    avatarKey: null,
    emailVerifiedAt: new Date(),
    emailVerificationToken: null,
    ...overrides,
  }
}

function makeUserStore(overrides: Partial<UserStore> = {}): UserStore {
  return {
    createEmailUser: async () => makeUser(),
    findOrFail: async () => makeUser(),
    findByEmail: async () => null,
    findByEmailOrFail: async () => makeUser(),
    findByVerificationToken: async () => null,
    verifyCredentials: async () => makeUser(),
    verifyPassword: async () => true,
    save: async (u) => u,
    updatePassword: async (u) => u,
    delete: async () => {},
    ...overrides,
  }
}

function makePasswordResetStore(seed?: AuthPasswordReset): PasswordResetStore {
  const tokens = new Map<string, AuthPasswordReset>()
  if (seed) {
    tokens.set(seed.token, seed)
  }

  return {
    async createForUser(userId: number, _duration: TokenDuration) {
      const row: AuthPasswordReset = {
        id: 1,
        userId,
        token: 'fresh',
        isExpired: false,
      }
      tokens.set(row.token, row)
      return row
    },
    async findByToken(token: string) {
      return tokens.get(token) ?? null
    },
    async deleteForUser(userId: number) {
      for (const [key, row] of tokens) {
        if (row.userId === userId) {
          tokens.delete(key)
        }
      }
    },
    async refreshToken(reset: AuthPasswordReset, _duration: TokenDuration) {
      return reset
    },
    async findUserByReset(reset: AuthPasswordReset) {
      return makeUser({ id: reset.userId })
    },
  }
}

test.group('AuthService - updatePassword token reuse', () => {
  test('second updatePassword with same token throws E_INVALID_TOKEN', async () => {
    const reset: AuthPasswordReset = {
      id: 1,
      userId: 1,
      token: 'reuse-me',
      isExpired: false,
    }
    const passwordResets = makePasswordResetStore(reset)
    const service = new AuthService(makeUserStore(), passwordResets)

    await service.updatePassword({ token: 'reuse-me', password: 'new-pass-1' })

    await assert.rejects(
      () => service.updatePassword({ token: 'reuse-me', password: 'new-pass-2' }),
      (err: any) => {
        assert.equal(err.code, 'E_INVALID_TOKEN')
        return true
      }
    )
  })
})
