/**
 * Optional Lucid SubscriptionStore.
 * Expects a Subscription model at #models/subscription with the usual Creem columns.
 */
import { DateTime } from 'luxon'
import SubscriptionModel from '#models/subscription'
import type {
  Subscription,
  SubscriptionSnapshot,
  SubscriptionStore,
} from '#modules/subscription/contracts/index'

function toSubscription(row: InstanceType<typeof SubscriptionModel>): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    creemCustomerId: row.creemCustomerId,
    creemSubscriptionId: row.creemSubscriptionId,
    creemProductId: row.creemProductId,
    plan: row.plan,
    status: row.status,
    currentPeriodStart: row.currentPeriodStart?.toJSDate() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toJSDate() ?? null,
    canceledAt: row.canceledAt?.toJSDate() ?? null,
  }
}

function period(date: Date) {
  return DateTime.fromJSDate(date)
}

export class LucidSubscriptionStore implements SubscriptionStore {
  async findCurrentByUserId(userId: number): Promise<Subscription | null> {
    const row = await SubscriptionModel.query()
      .where('userId', userId)
      .orderBy('currentPeriodEnd', 'desc')
      .first()
    return row ? toSubscription(row) : null
  }

  async findActiveByUserId(
    userId: number,
    activeStatuses: string[]
  ): Promise<Subscription | null> {
    const row = await SubscriptionModel.query()
      .where('userId', userId)
      .whereIn('status', activeStatuses)
      .orderBy('currentPeriodEnd', 'desc')
      .first()
    return row ? toSubscription(row) : null
  }

  async upsert(snapshot: SubscriptionSnapshot): Promise<void> {
    await SubscriptionModel.updateOrCreate(
      { userId: snapshot.userId, creemSubscriptionId: snapshot.id },
      {
        userId: snapshot.userId,
        creemCustomerId: snapshot.customerId,
        creemSubscriptionId: snapshot.id,
        creemProductId: snapshot.productId,
        plan: snapshot.productName,
        status: snapshot.status,
        currentPeriodStart: period(snapshot.currentPeriodStart),
        currentPeriodEnd: period(snapshot.currentPeriodEnd),
        canceledAt: snapshot.canceledAt ? period(snapshot.canceledAt) : null,
      }
    )
  }
}
