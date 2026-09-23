import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import testUtils from '@adonisjs/core/services/test_utils'
import { LucidUserStore } from '#modules/auth/stubs/adapters/lucid_user_store'
import { LucidPasswordResetStore } from '#modules/auth/stubs/adapters/lucid_password_reset_store'
import { LucidSubscriptionStore } from '#modules/subscription/stubs/adapters/lucid_subscription_store'
import User from '#models/user'

test.group('Lucid adapters', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('LucidUserStore.save round-trips avatarKey null as null', async () => {
    const store = new LucidUserStore()
    let user = await store.createEmailUser({
      email: 'avatar@test.com',
      password: 'secret',
      firstName: 'A',
      lastName: 'B',
    })
    user = await store.save({ ...user, avatarKey: null })
    assert.equal(user.avatarKey, null)

    const row = await User.findOrFail(user.id)
    assert.equal(row.avatarKey, null)
  })

  test('LucidSubscriptionStore.upsert twice yields one row', async () => {
    const users = new LucidUserStore()
    const user = await users.createEmailUser({
      email: 'sub@test.com',
      password: 'secret',
    })
    const store = new LucidSubscriptionStore()
    const snapshot = {
      id: 'sub_1',
      userId: user.id,
      customerId: 'cust_1',
      productId: 'prod_1',
      productName: 'Pro',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      canceledAt: null,
    }
    await store.upsert(snapshot)
    await store.upsert({ ...snapshot, status: 'trialing' })

    const current = await store.findCurrentByUserId(user.id)
    assert.ok(current)
    assert.equal(current.status, 'trialing')

    const { default: Subscription } = await import('#models/subscription')
    const count = await Subscription.query().where('userId', user.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('LucidPasswordResetStore.createForUser deletes prior rows', async () => {
    const users = new LucidUserStore()
    const user = await users.createEmailUser({
      email: 'reset@test.com',
      password: 'secret',
    })
    const store = new LucidPasswordResetStore()
    const first = await store.createForUser(user.id, { hours: 2 })
    const second = await store.createForUser(user.id, { hours: 2 })

    assert.equal(await store.findByToken(first.token), null)
    assert.ok(await store.findByToken(second.token))
  })
})
