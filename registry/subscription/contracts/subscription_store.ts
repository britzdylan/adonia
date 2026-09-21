import type { Subscription, SubscriptionSnapshot } from './types.ts'

/**
 * Host persistence for subscriptions. Lucid / Drizzle / etc. stay in adapters.
 */
export interface SubscriptionStore {
  /**
   * Current subscription for the user: the row with the latest currentPeriodEnd.
   */
  findCurrentByUserId(userId: number): Promise<Subscription | null>

  findActiveByUserId(userId: number, activeStatuses: string[]): Promise<Subscription | null>

  upsert(snapshot: SubscriptionSnapshot): Promise<void>
}
