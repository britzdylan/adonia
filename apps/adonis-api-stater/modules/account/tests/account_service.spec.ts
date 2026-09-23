import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import encryption from '@adonisjs/core/services/encryption'
import { defaultAccountOptions } from '#modules/account/options'
import { AccountService } from '#modules/account/service'
import { AuthService } from '#modules/auth/service'
import { MemoryUserStore } from '#modules/auth/tests/fakes/memory_user_store'
import { MemoryPasswordResetStore } from '#modules/auth/tests/fakes/memory_password_reset_store'
import { MemorySessionManager } from '#modules/auth/tests/fakes/memory_session_manager'
import { MemoryAvatarStorage } from '#modules/account/tests/fakes/memory_avatar_storage'

function makeAccount(users = new MemoryUserStore()) {
  const avatars = new MemoryAvatarStorage()
  const service = new AccountService(users, avatars)
  const emissions: Array<{ event: string; payload: any }> = []
  ;(service as any).emitSafe = async (event: string, payload: any) => {
    emissions.push({ event, payload })
  }
  return { service, users, avatars, emissions }
}

test.group('AccountService - email change', () => {
  test('after replaceEmail, login with the old address still succeeds', async () => {
    const users = new MemoryUserStore()
    const { service } = makeAccount(users)
    const auth = new AuthService(users, new MemoryPasswordResetStore(users))
    ;(auth as any).emitSafe = async () => {}

    let user = await users.createEmailUser({ email: 'old@test.com', password: 'secret' })
    user = await users.save({
      ...user,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    })

    await service.replaceEmail(user.id, { email: 'new@test.com' })
    const stored = await users.findOrFail(user.id)
    assert.equal(stored.email, 'old@test.com')
    assert.equal(stored.pendingEmail, 'new@test.com')

    const session = new MemorySessionManager()
    const result = await auth.loginByEmail(
      { email: 'old@test.com', password: 'secret' },
      session
    )
    assert.equal(result.user.email, 'old@test.com')
  })

  test('confirmEmailChange with mismatched token throws and leaves emails unchanged', async () => {
    const { service, users } = makeAccount()
    let user = await users.createEmailUser({ email: 'old@test.com', password: 'secret' })
    user = await users.save({ ...user, emailVerifiedAt: new Date() })
    await service.replaceEmail(user.id, { email: 'new@test.com' })

    await assert.rejects(
      () =>
        service.confirmEmailChange(
          encryption.encrypt('wrong@test.com', defaultAccountOptions.emailChangeTtl)
        ),
      (err: any) => {
        assert.equal(err.code, 'E_INVALID_TOKEN')
        return true
      }
    )

    const stored = await users.findOrFail(user.id)
    assert.equal(stored.email, 'old@test.com')
    assert.equal(stored.pendingEmail, 'new@test.com')
  })

  test('confirmEmailChange rejects if another user owns pendingEmail', async () => {
    const { service, users } = makeAccount()

    let user = await users.createEmailUser({ email: 'old@test.com', password: 'secret' })
    user = await users.save({ ...user, emailVerifiedAt: new Date() })
    const updated = await service.replaceEmail(user.id, { email: 'soon-taken@test.com' })

    // Race: address claimed after the change was requested
    await users.createEmailUser({ email: 'soon-taken@test.com', password: 'x' })

    await assert.rejects(
      () => service.confirmEmailChange(updated.emailVerificationToken!),
      (err: any) => {
        assert.equal(err.code, 'E_EMAIL_EXISTS')
        return true
      }
    )
  })

  test('confirmEmailChange swaps pendingEmail into email', async () => {
    const { service, users, emissions } = makeAccount()
    let user = await users.createEmailUser({ email: 'old@test.com', password: 'secret' })
    user = await users.save({ ...user, emailVerifiedAt: new Date() })
    const pending = await service.replaceEmail(user.id, { email: 'new@test.com' })
    const confirmed = await service.confirmEmailChange(pending.emailVerificationToken!)

    assert.equal(confirmed.email, 'new@test.com')
    assert.equal(confirmed.pendingEmail, null)
    assert.ok(confirmed.emailVerifiedAt)
    assert.ok(emissions.some((e) => e.event === 'Account:ConfirmEmailChange'))
  })
})

test.group('AccountService - password and delete', () => {
  test('replacePassword with wrong current password throws E_INVALID_PASSWORD', async () => {
    const { service, users } = makeAccount()
    const user = await users.createEmailUser({ email: 'a@test.com', password: 'secret' })

    await assert.rejects(
      () =>
        service.replacePassword(user.id, {
          currentPassword: 'wrong',
          newPassword: 'new-secret',
        }),
      (err: any) => {
        assert.equal(err.code, 'E_INVALID_PASSWORD')
        return true
      }
    )
  })

  test('deleteAccount removes the avatar and the user', async () => {
    const { service, users, avatars } = makeAccount()
    let user = await users.createEmailUser({ email: 'a@test.com', password: 'secret' })
    user = await users.save({ ...user, avatarKey: 'avatars/1.png' })

    await service.deleteAccount(user.id)

    assert.deepEqual(avatars.deleted, ['avatars/1.png'])
    assert.equal(users.users.has(user.id), false)
  })
})
