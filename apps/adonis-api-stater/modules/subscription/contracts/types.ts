/**
 * Portable subscription DTO + webhook snapshot.
 * Host adapters map persistence models ↔ these shapes.
 */

export type Subscription = {
  id: string | number
  userId: number
  creemCustomerId: string
  creemSubscriptionId: string | null
  creemProductId: string
  /** Product display name as stored from Creem (informational). */
  plan: string
  status: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  canceledAt: Date | null
}

/**
 * Normalized Creem subscription payload used for upsert.
 * Mapped from webhook context inside the service — store never sees creem_io types.
 */
export type SubscriptionSnapshot = {
  id: string
  userId: number
  customerId: string
  productId: string
  productName: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  canceledAt: Date | null
}

export type SubscriptionConfig = {
  /** Statuses treated as entitled. Defaults from options.ts. */
  activeStatuses?: string[]
}
