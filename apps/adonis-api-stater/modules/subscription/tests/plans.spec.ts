import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { PlanService, definePlans } from '#modules/subscription/plans'
import type { Subscription } from '#modules/subscription/contracts/index'

const plans = definePlans(
  {
    Free: { seats: 1, projects: 3 },
    Pro: { seats: 10, projects: -1 },
    Business: { seats: 50, projects: -1 },
  },
  'Free'
)

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    userId: 1,
    creemCustomerId: 'c',
    creemSubscriptionId: 'sub_1',
    creemProductId: 'prod_pro',
    plan: 'Pro',
    status: 'active',
    currentPeriodStart: new Date('2026-03-05T00:00:00Z'),
    currentPeriodEnd: new Date('2026-04-05T00:00:00Z'),
    canceledAt: null,
    ...overrides,
  }
}

function make(sub: Subscription | null, productPlans: Record<string, string> = {}) {
  const unknown: unknown[] = []
  const service = new PlanService(
    plans,
    { getSubscription: async () => sub },
    { resolveProductPlan: (id: string) => productPlans[id] ?? 'Free' },
    { onUnknownPlan: (d) => unknown.push(d) }
  )
  return { service, unknown }
}

test.group('definePlans', () => {
  test('fromProductName matches exact names and words, else the default', () => {
    assert.equal(plans.fromProductName('pro'), 'Pro')
    assert.equal(plans.fromProductName('Acme Business Yearly'), 'Business')
    assert.equal(plans.fromProductName('Pro Monthly'), 'Pro')
    assert.equal(plans.fromProductName('Enterprise'), 'Free')
    assert.equal(plans.fromProductName(null), 'Free')
  })

  test('isPlan and limits', () => {
    assert.equal(plans.isPlan('Pro'), true)
    assert.equal(plans.isPlan('pro'), false)
    assert.deepEqual(plans.limits('Pro'), { seats: 10, projects: -1 })
  })
})

test.group('PlanService', () => {
  test('no or inactive subscription is the default plan', async () => {
    assert.equal(await make(null).service.getUserPlan(1), 'Free')
    assert.equal(await make(subscription({ status: 'canceled' })).service.getUserPlan(1), 'Free')
  })

  test('the product id decides the plan before the product name', async () => {
    const { service } = make(subscription({ plan: 'Renamed in Creem' }), { prod_pro: 'Business' })
    assert.equal(await service.getUserPlan(1), 'Business')
    assert.deepEqual(await service.getLimits(1), { seats: 50, projects: -1 })
  })

  test('falls back to the product name when the id is not mapped', async () => {
    const { service, unknown } = make(subscription({ plan: 'Pro Monthly' }))
    assert.equal(await service.getUserPlan(1), 'Pro')
    assert.equal(unknown.length, 0)
  })

  test('reports an active subscription that matches no plan', async () => {
    const { service, unknown } = make(subscription({ plan: 'Mystery', creemProductId: 'prod_x' }))
    assert.equal(await service.getUserPlan(1), 'Free')
    assert.deepEqual(unknown, [{ userId: 1, product: 'Mystery', productId: 'prod_x' }])
  })

  test('getCurrentPeriod uses the subscription or the UTC month', async () => {
    const withSub = await make(subscription()).service.getCurrentPeriod(1)
    assert.equal(withSub.start.toISOString(), '2026-03-05T00:00:00.000Z')

    const month = await make(null).service.getCurrentPeriod(1, new Date('2026-02-14T12:00:00Z'))
    assert.equal(month.start.toISOString(), '2026-02-01T00:00:00.000Z')
    assert.equal(month.end.toISOString(), '2026-02-28T23:59:59.999Z')
  })
})
