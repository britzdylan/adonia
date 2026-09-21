import type {
  Subscription,
  SubscriptionSnapshot,
  SubscriptionStore,
} from '#modules/subscription/contracts/index'

/**
 * In-memory SubscriptionStore. upsert keys on (userId, creemSubscriptionId).
 */
export class MemorySubscriptionStore implements SubscriptionStore {
  rows: Subscription[] = []
  upserts: SubscriptionSnapshot[] = []
  nextId = 1

  async findCurrentByUserId(userId: number): Promise<Subscription | null> {
    const matches = this.rows
      .filter((row) => row.userId === userId)
      .sort((a, b) => {
        const aEnd = a.currentPeriodEnd?.getTime() ?? 0
        const bEnd = b.currentPeriodEnd?.getTime() ?? 0
        return bEnd - aEnd
      })
    return matches[0] ?? null
  }

  async findActiveByUserId(
    userId: number,
    activeStatuses: string[]
  ): Promise<Subscription | null> {
    const matches = this.rows
      .filter((row) => row.userId === userId && activeStatuses.includes(row.status))
      .sort((a, b) => {
        const aEnd = a.currentPeriodEnd?.getTime() ?? 0
        const bEnd = b.currentPeriodEnd?.getTime() ?? 0
        return bEnd - aEnd
      })
    return matches[0] ?? null
  }

  async upsert(snapshot: SubscriptionSnapshot): Promise<void> {
    this.upserts.push(snapshot)
    const index = this.rows.findIndex(
      (row) => row.userId === snapshot.userId && row.creemSubscriptionId === snapshot.id
    )
    const next: Subscription = {
      id: index >= 0 ? this.rows[index].id : this.nextId++,
      userId: snapshot.userId,
      creemCustomerId: snapshot.customerId,
      creemSubscriptionId: snapshot.id,
      creemProductId: snapshot.productId,
      plan: snapshot.productName,
      status: snapshot.status,
      currentPeriodStart: snapshot.currentPeriodStart,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      canceledAt: snapshot.canceledAt,
    }
    if (index >= 0) {
      this.rows[index] = next
    } else {
      this.rows.push(next)
    }
  }
}
