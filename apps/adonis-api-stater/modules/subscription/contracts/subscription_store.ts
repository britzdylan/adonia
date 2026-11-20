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

  /**
   * Every subscription of the user that has a Creem subscription id and a
   * status not in `endedStatuses`: the ones that can still charge the user.
   */
  findNotEndedByUserId(userId: number, endedStatuses: string[]): Promise<Subscription[]>
}
