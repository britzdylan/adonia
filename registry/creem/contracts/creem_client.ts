import type { CreemInvoice } from './types.ts'

/**
 * Narrow port over the Creem payment SDK.
 * Host supplies a creem_io adapter (or a test double).
 */
export interface CreemClient {
  createCheckout(input: {
    successUrl: string
    productId: string
    customerEmail: string
    userId: number
  }): Promise<{ checkoutUrl: string | null | undefined }>

  createPortalLink(customerId: string): Promise<{ portalUrl: string }>

  listTransactions(
    customerId: string,
    limit: number
  ): Promise<{ items: CreemInvoice[] }>

  handleWebhookEvents(
    rawBody: string,
    signature: string,
    handlers: CreemWebhookHandlers
  ): Promise<void>
}

/**
 * Webhook handlers passed through to the SDK.
 * Typed loosely so the host can use creem_io's WebhookOptions shape
 * without this contract importing the SDK.
 */
export type CreemWebhookHandlers = Record<string, ((...args: any[]) => any) | undefined>
