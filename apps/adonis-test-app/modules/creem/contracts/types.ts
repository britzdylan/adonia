/**
 * Creem module config + shared value types.
 * Product→plan mapping and default plan are host-owned.
 */

/** Plan names are free-form strings owned by the host. */
export type CreemPlan = string

export type CreemConfig = {
  successUrl: string
  /** Creem product id → plan name */
  productPlans: Record<string, CreemPlan>
  /** Plan when a product id is unmapped. Also used by SubscriptionService. */
  defaultPlan: string
}

export type CreemClientOptions = {
  apiKey: string
  webhookSecret?: string
  testMode?: boolean
}

export type CreemInvoice = {
  id: string
  type: 'payment' | 'invoice'
  amount: number
  currency: string
  status: string
  createdAt: number
}
