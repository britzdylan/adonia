import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { CreemService } from '#modules/creem/service'
import { SubscriptionService } from '#modules/subscription/service'
import { FakeCreemClient, makeNormalizedSub } from '#modules/creem/tests/fakes/fake_creem_client'
import { MemorySubscriptionStore } from '#modules/subscription/tests/fakes/memory_subscription_store'

function makeBilling(productPlans: Record<string, string> = { prod_pro: 'pro' }) {
  const client = new FakeCreemClient()
  const creem = new CreemService(client, {
    successUrl: 'https://app.test/success',
    productPlans,
    defaultPlan: 'starter',
  })
  const store = new MemorySubscriptionStore()
  const subscriptions = new SubscriptionService(store, creem)
  const emissions: Array<{ event: string; payload: any }> = []
  ;(creem as any).emitSafe = async () => {}
  ;(subscriptions as any).emitSafe = async (event: string, payload: any) => {
    emissions.push({ event, payload })
  }
  return { client, creem, store, subscriptions, emissions }
}

test.group('CreemService - resolveProductPlan', () => {
  test('maps known products and falls back to defaultPlan', async () => {
    const { creem } = makeBilling({ prod_pro: 'pro' })
    assert.equal(creem.resolveProductPlan('prod_pro'), 'pro')
    assert.equal(creem.resolveProductPlan('prod_unknown'), 'starter')
    assert.equal(creem.defaultPlan, 'starter')
  })
})

test.group('SubscriptionService - getUserPlan', () => {
  test('no subscription returns defaultPlan', async () => {
    const { subscriptions } = makeBilling()
    assert.equal(await subscriptions.getUserPlan(1), 'starter')
  })

  test('inactive subscription returns defaultPlan', async () => {
    const { subscriptions, store } = makeBilling()
    await store.upsert({
      id: 'sub_1',
      userId: 1,
      customerId: 'c',
      productId: 'prod_pro',
      productName: 'Pro',
      status: 'canceled',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      canceledAt: new Date('2024-01-15'),
    })
    assert.equal(await subscriptions.getUserPlan(1), 'starter')
  })

  test('active mapped product returns plan', async () => {
    const { subscriptions, store } = makeBilling()
    await store.upsert({
      id: 'sub_1',
      userId: 1,
      customerId: 'c',
      productId: 'prod_pro',
      productName: 'Pro',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      canceledAt: null,
    })
    assert.equal(await subscriptions.getUserPlan(1), 'pro')
  })

  test('active unmapped product returns defaultPlan', async () => {
    const { subscriptions, store } = makeBilling()
    await store.upsert({
      id: 'sub_1',
      userId: 1,
      customerId: 'c',
      productId: 'prod_unknown',
      productName: 'X',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      canceledAt: null,
    })
    assert.equal(await subscriptions.getUserPlan(1), 'starter')
  })
})

test.group('SubscriptionService - syncFromWebhook', () => {
  test('payload without metadata.userId is ignored', async () => {
    const { client, subscriptions, store, emissions } = makeBilling()
    client.nextHandler = {
      name: 'onGrantAccess',
      payload: makeNormalizedSub({ metadata: {} }),
    }
    await subscriptions.syncFromWebhook('body', 'sig')
    assert.equal(store.rows.length, 0)
    assert.equal(emissions.length, 0)
  })

  test('grant upserts and emits Activated', async () => {
    const { client, subscriptions, store, emissions } = makeBilling()
    client.nextHandler = {
      name: 'onGrantAccess',
      payload: makeNormalizedSub({ status: 'active' }),
    }
    await subscriptions.syncFromWebhook('body', 'sig')
    assert.equal(store.rows.length, 1)
    assert.equal(emissions[0]?.event, 'Subscription:Activated')
  })

  test('revoke, cancel, scheduled cancel, and update each upsert and emit', async () => {
    const cases = [
      ['onRevokeAccess', 'Subscription:Revoked'],
      ['onSubscriptionCanceled', 'Subscription:Canceled'],
      ['onSubscriptionScheduledCancel', 'Subscription:ScheduledCancel'],
      ['onSubscriptionUpdate', 'Subscription:Updated'],
    ] as const

    for (const [handler, event] of cases) {
      const { client, subscriptions, store, emissions } = makeBilling()
      client.nextHandler = {
        name: handler,
        payload: makeNormalizedSub({ status: 'canceled', id: `sub_${handler}` }),
      }
      await subscriptions.syncFromWebhook('body', 'sig')
      assert.equal(store.rows.length, 1, handler)
      assert.equal(emissions[0]?.event, event, handler)
    }
  })

  test('delivering the same webhook twice produces one row', async () => {
    const { client, subscriptions, store } = makeBilling()
    const payload = makeNormalizedSub()
    client.nextHandler = { name: 'onGrantAccess', payload }
    await subscriptions.syncFromWebhook('body', 'sig')
    await subscriptions.syncFromWebhook('body', 'sig')
    assert.equal(store.rows.length, 1)
  })

  test('update before grant_access produces one row in the updated state', async () => {
    const { client, subscriptions, store } = makeBilling()
    client.nextHandler = {
      name: 'onSubscriptionUpdate',
      payload: makeNormalizedSub({ status: 'active', product: { id: 'prod_pro', name: 'Pro' } }),
    }
    await subscriptions.syncFromWebhook('body', 'sig')
    client.nextHandler = {
      name: 'onGrantAccess',
      payload: makeNormalizedSub({
        status: 'trialing',
        product: { id: 'prod_pro', name: 'Pro Trial' },
      }),
    }
    await subscriptions.syncFromWebhook('body', 'sig')
    assert.equal(store.rows.length, 1)
    assert.equal(store.rows[0].status, 'trialing')
    assert.equal(store.rows[0].plan, 'Pro Trial')
  })

  test('canceled older row plus newer active resolves to active plan', async () => {
    const { subscriptions, store } = makeBilling()
    await store.upsert({
      id: 'sub_old',
      userId: 1,
      customerId: 'c',
      productId: 'prod_pro',
      productName: 'Pro',
      status: 'canceled',
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      canceledAt: new Date('2023-01-15'),
    })
    await store.upsert({
      id: 'sub_new',
      userId: 1,
      customerId: 'c',
      productId: 'prod_pro',
      productName: 'Pro',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      canceledAt: null,
    })
    assert.equal(await subscriptions.getUserPlan(1), 'pro')
    const current = await subscriptions.getSubscription(1)
    assert.equal(current?.creemSubscriptionId, 'sub_new')
  })
})
