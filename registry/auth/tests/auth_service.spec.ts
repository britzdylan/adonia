import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import encryption from '@adonisjs/core/services/encryption'
import { AuthService } from '#modules/auth/service'
import { MemoryUserStore } from '#modules/adapters/tests/memory_user_store'
import { MemoryPasswordResetStore } from '#modules/auth/tests/fakes/memory_password_reset_store'
import { MemorySessionManager } from '#modules/auth/tests/fakes/memory_session_manager'

function makeAuth() {
  const users = new MemoryUserStore()
  const passwordResets = new MemoryPasswordResetStore(users)
  const service = new AuthService(users, passwordResets)
  const emissions: Array<{ event: string; payload: any }> = []
  ;(service as any).emitSafe = async (event: string, payload: any) => {
    emissions.push({ event, payload })
  }
  return { service, users, passwordResets, emissions }
}

test.group('AuthService - register and activate', () => {
  test('register issues a verification token', async () => {
    const { service, users } = makeAuth()
    const user = await service.registerUser({
      email: 'a@test.com',
      password: 'secret',
      firstName: 'A',
    })
    assert.ok(user.emailVerificationToken)
    assert.equal(users.users.get(user.id)?.emailVerificationToken, user.emailVerificationToken)
  })

  test('activate with a valid token verifies the user', async () => {
    const { service } = makeAuth()
    const registered = await service.registerUser({
      email: 'a@test.com',
      password: 'secret',
    })
    const token = registered.emailVerificationToken!
    const verified = await service.activateUserAccount(token)
    assert.ok(verified.emailVerifiedAt)
    assert.equal(verified.emailVerificationToken, null)
  })

  test('activate with an expired token throws E_INVALID_TOKEN', async () => {
    const { service, users } = makeAuth()
    const registered = await service.registerUser({
      email: 'a@test.com',
      password: 'secret',
    })
    const expired = encryption.encrypt(registered.email, '-1 hours')
    const stored = users.users.get(registered.id)!
    stored.emailVerificationToken = expired
    users.users.set(stored.id, stored)

    await assert.rejects(
      () => service.activateUserAccount(expired),
      (err: any) => {
        assert.equal(err.code, 'E_INVALID_TOKEN')
        return true
      }
    )
  })
})

test.group('AuthService - loginByEmail', () => {
  test('login for an unverified user throws and has no side effects', async () => {
    const { service, users, emissions } = makeAuth()
    const registered = await service.registerUser({
      email: 'a@test.com',
      password: 'secret',
    })
    const savesBefore = users.saves.length
    emissions.length = 0

    const session = new MemorySessionManager()
    await assert.rejects(
      () => service.loginByEmail({ email: 'a@test.com', password: 'secret' }, session),
      (err: any) => {
        assert.equal(err.code, 'E_ACCOUNT_UNVERIFIED')
        return true
      }
    )

    assert.equal(users.saves.length, savesBefore)
    assert.equal(emissions.length, 0)
    assert.equal(session.logins.length, 0)
    assert.equal(registered.emailVerifiedAt, null)
  })

  test('login returns user and session result', async () => {
    const { service } = makeAuth()
    const registered = await service.registerUser({
      email: 'a@test.com',
      password: 'secret',
    })
    await service.activateUserAccount(registered.emailVerificationToken!)

    const session = new MemorySessionManager()
    session.result = { token: 'tok', expiresAt: new Date('2030-01-01') }
    const result = await service.loginByEmail({ email: 'a@test.com', password: 'secret' }, session)

    assert.equal(result.user.email, 'a@test.com')
    assert.equal(result.session.token, 'tok')
  })
})

test.group('AuthService - password reset', () => {
  test('request creates one row and deletes older rows', async () => {
    const { service, users, passwordResets } = makeAuth()
    const user = await users.createEmailUser({ email: 'a@test.com', password: 'secret' })
    await service.requestPasswordReset('a@test.com')
    await service.requestPasswordReset('a@test.com')
    assert.equal(passwordResets.rows.size, 1)
    assert.equal([...passwordResets.rows.values()][0].userId, user.id)
    assert.equal(passwordResets.createCalls.length, 2)
  })

  test('validate rotates the token', async () => {
    const { service, users, passwordResets } = makeAuth()
    await users.createEmailUser({ email: 'a@test.com', password: 'secret' })
    await service.requestPasswordReset('a@test.com')
    const original = [...passwordResets.byToken.keys()][0]
    const refreshed = await service.validatePasswordResetToken(original)
    assert.notEqual(refreshed.token, original)
    assert.equal(await passwordResets.findByToken(original), null)
  })

  test('update succeeds once and the token is dead afterward', async () => {
    const { service, users, passwordResets } = makeAuth()
    await users.createEmailUser({ email: 'a@test.com', password: 'secret' })
    await service.requestPasswordReset('a@test.com')
    const token = [...passwordResets.byToken.keys()][0]

    await service.updatePassword({ token, password: 'new-pass' })
    assert.equal(await users.verifyPassword(1, 'new-pass'), true)

    await assert.rejects(
      () => service.updatePassword({ token, password: 'another' }),
      (err: any) => {
        assert.equal(err.code, 'E_INVALID_TOKEN')
        return true
      }
    )
  })
})
