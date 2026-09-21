/**
 * SubscriptionService
 *
 * Generic subscription state + Creem webhook sync.
 * Every webhook handler upserts (idempotent, order-independent).
 * Plan default comes from CreemService.defaultPlan.
 */
import ApiService from '#modules/api/service'
import type { CreemService } from '#modules/creem/service'
import type {
  Subscription,
  SubscriptionConfig,
  SubscriptionSnapshot,
  SubscriptionStore,
} from '#modules/subscription/contracts/index'
import { defaultSubscriptionOptions } from '#modules/subscription/options'
import '#modules/subscription/events'

export class SubscriptionService extends ApiService {
  namespace = 'subscription'

  private activeStatuses: string[]

  constructor(
    private subscriptions: SubscriptionStore,
    private creem: CreemService,
    config: SubscriptionConfig = {}
  ) {
    super()
    this.activeStatuses = config.activeStatuses ?? defaultSubscriptionOptions.activeStatuses
  }

  /**
   * Returns the user's current subscription record, or null if none exists.
   */
  async getSubscription(userId: number): Promise<Subscription | null> {
    return this.subscriptions.findCurrentByUserId(userId)
  }

  /**
   * Resolves the plan key via Creem product→plan map when the subscription
   * is active; otherwise returns CreemService.defaultPlan.
   */
  async getUserPlan(userId: number): Promise<string> {
    const sub = await this.getSubscription(userId)
    if (!sub || !this.activeStatuses.includes(sub.status)) {
      return this.creem.defaultPlan
    }
    return this.creem.resolveProductPlan(sub.creemProductId)
  }

  /**
   * Billing period start. Without a subscription, uses start of the current UTC month.
   */
  async getCurrentPeriodStart(userId: number): Promise<Date> {
    const sub = await this.getSubscription(userId)
    if (sub?.currentPeriodStart) {
      return sub.currentPeriodStart
    }
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  }

  /**
   * True when the user has a subscription in an active status.
   */
  async isActive(userId: number): Promise<boolean> {
    const sub = await this.subscriptions.findActiveByUserId(userId, this.activeStatuses)
    return sub !== null
  }

  /**
   * Processes a Creem webhook. SDK verifies signature; every handler upserts.
   */
  async syncFromWebhook(rawBody: string, signature: string): Promise<void> {
    await this.creem.handleWebhookEvents(rawBody, signature, {
      onGrantAccess: async (context) => {
        const snapshot = this.toSnapshot(context)
        if (!snapshot) return
        await this.subscriptions.upsert(snapshot)
        this.emitSafe('Subscription:Activated', { userId: snapshot.userId })
      },

      onRevokeAccess: async (context) => {
        const snapshot = this.toSnapshot(context)
        if (!snapshot) return
        await this.subscriptions.upsert(snapshot)
        this.emitSafe('Subscription:Revoked', { userId: snapshot.userId })
      },

      onSubscriptionCanceled: async (data) => {
        const snapshot = this.toSnapshot(data)
        if (!snapshot) return
        await this.subscriptions.upsert(snapshot)
        this.emitSafe('Subscription:Canceled', { userId: snapshot.userId })
      },

      onSubscriptionScheduledCancel: async (data) => {
        const snapshot = this.toSnapshot(data)
        if (!snapshot) return
        await this.subscriptions.upsert(snapshot)
        this.emitSafe('Subscription:ScheduledCancel', { userId: snapshot.userId })
      },

      onSubscriptionUpdate: async (data) => {
        const snapshot = this.toSnapshot(data)
        if (!snapshot) return
        await this.subscriptions.upsert(snapshot)
        this.emitSafe('Subscription:Updated', { userId: snapshot.userId })
      },

      onRefundCreated: async (data) => {
        this.emitSafe('Subscription:RefundCreated', { refundId: String(data?.id ?? '') })
      },
    })
  }

  /**
   * Maps a Creem webhook payload into a store snapshot.
   * Requires metadata.userId (set at checkout).
   */
  private toSnapshot(payload: any): SubscriptionSnapshot | null {
    const userId = Number(payload?.metadata?.userId)
    if (!userId || Number.isNaN(userId)) {
      return null
    }

    return {
      id: String(payload.id),
      userId,
      customerId: String(payload.customer.id),
      productId: String(payload.product.id),
      productName: String(payload.product.name),
      status: String(payload.status),
      currentPeriodStart: new Date(payload.currentPeriodStartDate),
      currentPeriodEnd: new Date(payload.currentPeriodEndDate),
      canceledAt: payload.canceledAt ? new Date(payload.canceledAt) : null,
    }
  }
}
