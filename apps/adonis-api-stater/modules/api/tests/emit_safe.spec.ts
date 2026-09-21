import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import emitter from '@adonisjs/core/services/emitter'
import config from '@adonisjs/core/services/config'
import { AuthService } from '#modules/auth/service'
import type { User, UserStore } from '#modules/contracts/index'
import type { PasswordResetStore } from '#modules/auth/contracts/index'
import '#modules/auth/events'

function makeUser(): User {
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
  }
}

function makeUserStore(): UserStore {
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
  }
}

function makePasswordResetStore(): PasswordResetStore {
  return {
    createForUser: async () => ({ id: 1, userId: 1, token: 't', isExpired: false }),
    findByToken: async () => null,
    deleteForUser: async () => {},
    refreshToken: async (r) => r,
    findUserByReset: async () => makeUser(),
  }
}

test.group('ApiService emitSafe', () => {
  test('emits listed events and skips unlisted ones', async () => {
    const service = new AuthService(makeUserStore(), makePasswordResetStore())
    const emitted: string[] = []
    const originalEmit = emitter.emit.bind(emitter)
    const originalGet = config.get.bind(config)

    ;(emitter as any).emit = async (event: string, payload: unknown) => {
      emitted.push(event)
      return originalEmit(event as any, payload as any)
    }

    ;(config as any).get = (key: string) => {
      if (key === 'modules.auth') {
        return {
          description: 'test',
          emits: ['Auth:Logout'],
        }
      }
      return originalGet(key)
    }

    try {
      await service.emitSafe('Auth:Logout', null)
      await service.emitSafe('Auth:Login', { user: makeUser() })
      assert.deepEqual(emitted, ['Auth:Logout'])
    } finally {
      ;(emitter as any).emit = originalEmit
      ;(config as any).get = originalGet
    }
  })

  test('resolves when a listener throws', async () => {
    const service = new AuthService(makeUserStore(), makePasswordResetStore())
    const originalEmit = emitter.emit.bind(emitter)
    const originalGet = config.get.bind(config)

    ;(config as any).get = (key: string) => {
      if (key === 'modules.auth') {
        return {
          description: 'test',
          emits: ['Auth:Logout'],
        }
      }
      return originalGet(key)
    }

    ;(emitter as any).emit = async () => {
      throw new Error('listener boom')
    }

    try {
      await service.emitSafe('Auth:Logout', null)
    } finally {
      ;(emitter as any).emit = originalEmit
      ;(config as any).get = originalGet
    }
  })
})
