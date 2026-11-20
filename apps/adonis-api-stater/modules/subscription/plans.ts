/**
 * Plans and their limits, defined by the host.
 *
 * The module does not know plan names or limit fields: the host passes a
 * catalog such as `{ Free: { seats: 1 }, Pro: { seats: 10 } }` and the
 * name of the plan users get without an active subscription.
 */
import type { CreemService } from '#modules/creem/service'
import type { SubscriptionService } from '#modules/subscription/service'
import { defaultSubscriptionOptions } from '#modules/subscription/options'

export type PlanCatalog<C extends Record<string, object>> = {
  readonly names: readonly (keyof C & string)[]
  readonly defaultPlan: keyof C & string
  isPlan(value: string | null | undefined): value is keyof C & string
  /**
   * Plan from a product display name: an exact match ("Pro"), then a word
   * match ("Acme Pro Monthly"). Billing words (monthly, yearly, annual) are
   * ignored. Anything else is the default plan, so a limit lookup never fails.
   */
  fromProductName(productName: string | null | undefined): keyof C & string
  limits<P extends keyof C & string>(plan: P): C[P]
}

export function definePlans<const C extends Record<string, object>>(
  plans: C,
  defaultPlan: keyof C & string
): PlanCatalog<C> {
  const names = Object.keys(plans) as (keyof C & string)[]
  const isPlan = (value: string | null | undefined): value is keyof C & string =>
    typeof value === 'string' && (names as string[]).includes(value)

  return {
    names,
    defaultPlan,
    isPlan,
    fromProductName(productName) {
      const name = (productName ?? '')
        .replace(/\b(monthly|yearly|annual|annually)\b/gi, '')
        .trim()
        .toLowerCase()
      const exact = names.find((plan) => plan.toLowerCase() === name)
      if (exact) return exact
      const words = name.split(/[^a-z0-9]+/)
      const byWord = names.find(
        (plan) => plan !== defaultPlan && words.includes(plan.toLowerCase())
      )
      return byWord ?? defaultPlan
    },
    limits(plan) {
      return plans[plan]
    },
  }
}

export type BillingPeriod = { start: Date; end: Date }

export type PlanServiceOptions = {
  /** Statuses treated as entitled. Defaults from options.ts. */
  activeStatuses?: string[]
  /** An active subscription whose product matches no plan (it gets the default). */
  onUnknownPlan?: (details: { userId: number; product: string; productId: string }) => void
}

/**
 * Which plan a user is on and what it allows, on top of SubscriptionService.
 * Usage counting stays in the host.
 *
 * The plan comes from the Creem product id (CreemConfig.productPlans), so
 * renaming a product in Creem cannot change limits. When the id is not
 * mapped, the stored product name is tried, then the default plan.
 */
export class PlanService<C extends Record<string, object>> {
  private activeStatuses: string[]

  constructor(
    private plans: PlanCatalog<C>,
    private subscriptions: Pick<SubscriptionService, 'getSubscription'>,
    private creem: Pick<CreemService, 'resolveProductPlan'>,
    private options: PlanServiceOptions = {}
  ) {
    this.activeStatuses = options.activeStatuses ?? defaultSubscriptionOptions.activeStatuses
  }

  async getUserPlan(userId: number): Promise<keyof C & string> {
    const sub = await this.subscriptions.getSubscription(userId)
    if (!sub || !this.activeStatuses.includes(sub.status)) return this.plans.defaultPlan

    const byProduct = this.creem.resolveProductPlan(sub.creemProductId)
    if (this.plans.isPlan(byProduct) && byProduct !== this.plans.defaultPlan) return byProduct

    const byName = this.plans.fromProductName(sub.plan)
    const namesDefault =
      (sub.plan ?? '').trim().toLowerCase() === this.plans.defaultPlan.toLowerCase()
    if (byName === this.plans.defaultPlan && !namesDefault) {
      this.options.onUnknownPlan?.({ userId, product: sub.plan, productId: sub.creemProductId })
    }
    return byName
  }

  async getLimits(userId: number): Promise<C[keyof C & string]> {
    return this.plans.limits(await this.getUserPlan(userId))
  }

  /**
   * The current billing period. Without a subscription period, the current
   * UTC calendar month.
   */
  async getCurrentPeriod(userId: number, now: Date = new Date()): Promise<BillingPeriod> {
    const sub = await this.subscriptions.getSubscription(userId)
    if (sub?.currentPeriodStart && sub.currentPeriodEnd) {
      return { start: sub.currentPeriodStart, end: sub.currentPeriodEnd }
    }
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1),
    }
  }
}
