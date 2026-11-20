import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import testUtils from '@adonisjs/core/services/test_utils'
import { LucidUserStore } from '#modules/auth/stubs/adapters/lucid_user_store'
import { LucidPasswordResetStore } from '#modules/auth/stubs/adapters/lucid_password_reset_store'
import { LucidSubscriptionStore } from '#modules/subscription/stubs/adapters/lucid_subscription_store'
import { LucidAppNotificationStore } from '#modules/notification/stubs/adapters/lucid_app_notification_store'
import { LucidNotificationPreferenceStore } from '#modules/notification/stubs/adapters/lucid_notification_preference_store'
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

  test('LucidSubscriptionStore.findNotEndedByUserId skips ended rows', async () => {
    const users = new LucidUserStore()
    const user = await users.createEmailUser({ email: 'ended@test.com', password: 'secret' })
    const store = new LucidSubscriptionStore()
    const base = {
      userId: user.id,
      customerId: 'cust_1',
      productId: 'prod_1',
      productName: 'Pro',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      canceledAt: null,
    }
    await store.upsert({ ...base, id: 'sub_live', status: 'active' })
    await store.upsert({ ...base, id: 'sub_done', status: 'canceled' })

    const live = await store.findNotEndedByUserId(user.id, ['canceled', 'expired'])
    assert.deepEqual(
      live.map((row) => row.creemSubscriptionId),
      ['sub_live']
    )
  })

  test('LucidAppNotificationStore reads and marks only the owner inbox', async () => {
    const users = new LucidUserStore()
    const owner = await users.createEmailUser({ email: 'inbox@test.com', password: 'secret' })
    const other = await users.createEmailUser({ email: 'other@test.com', password: 'secret' })
    const store = new LucidAppNotificationStore()
    await store.create({ userId: owner.id, type: 'note', title: 'one', body: 'b' })
    await store.create({ userId: owner.id, type: 'note', title: 'two', body: 'b' })
    await store.create({ userId: other.id, type: 'note', title: 'theirs', body: 'b' })

    const unread = await store.listUnread(owner.id, 10)
    assert.equal(unread.length, 2)
    assert.equal(await store.countUnread(owner.id), 2)

    const [theirs] = await store.listUnread(other.id, 10)
    assert.equal(await store.markRead(owner.id, theirs.id, new Date()), null)

    const marked = await store.markRead(owner.id, unread[0].id, new Date())
    assert.ok(marked?.readAt)
    assert.equal(await store.markAllRead(owner.id, new Date()), 1)
    assert.equal(await store.countUnread(owner.id), 0)
    assert.equal(await store.countUnread(other.id), 1)
  })

  test('LucidNotificationPreferenceStore reads only allowed boolean columns', async () => {
    const users = new LucidUserStore()
    const user = await users.createEmailUser({ email: 'prefs@test.com', password: 'secret' })
    const row = await User.findOrFail(user.id)
    row.emailWeeklyDigest = true
    row.emailMarketing = false
    await row.save()

    const store = new LucidNotificationPreferenceStore(['emailWeeklyDigest', 'emailMarketing'])
    assert.equal(await store.isEnabled(user.id, 'emailWeeklyDigest'), true)
    assert.equal(await store.isEnabled(user.id, 'emailMarketing'), false)
    assert.equal(await store.isEnabled(user.id, 'password'), false)
    assert.equal(await store.isEnabled(999_999, 'emailWeeklyDigest'), false)
  })
})
