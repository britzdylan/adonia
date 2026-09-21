import type {
  CreemClient,
  CreemInvoice,
  CreemWebhookHandlers,
} from '#modules/creem/contracts/index'

type CheckoutInput = {
  successUrl: string
  productId: string
  customerEmail: string
  userId: number
}

/**
 * Fake CreemClient. handleWebhookEvents invokes a named handler with canned data.
 */
export class FakeCreemClient implements CreemClient {
  checkouts: CheckoutInput[] = []
  portalCalls: string[] = []
  listCalls: Array<{ customerId: string; limit: number }> = []
  checkoutUrl: string | null = 'https://pay.creem.io/checkout/1'
  portalUrl = 'https://portal.creem.io/1'
  invoices: CreemInvoice[] = []

  /** When set, handleWebhookEvents calls this handler name with handlerPayload. */
  nextHandler: { name: string; payload: any } | null = null

  async createCheckout(input: CheckoutInput) {
    this.checkouts.push(input)
    return { checkoutUrl: this.checkoutUrl }
  }

  async createPortalLink(customerId: string) {
    this.portalCalls.push(customerId)
    return { portalUrl: this.portalUrl }
  }

  async listTransactions(customerId: string, limit: number) {
    this.listCalls.push({ customerId, limit })
    return { items: this.invoices }
  }

  async handleWebhookEvents(
    _rawBody: string,
    _signature: string,
    handlers: CreemWebhookHandlers
  ) {
    if (!this.nextHandler) return
    const fn = handlers[this.nextHandler.name]
    if (fn) {
      await fn(this.nextHandler.payload)
    }
  }
}

export function makeNormalizedSub(overrides: Record<string, any> = {}) {
  return {
    id: 'sub_123',
    status: 'active',
    metadata: { userId: '1' },
    customer: { id: 'cust_123' },
    product: { id: 'prod_123', name: 'Pro' },
    currentPeriodStartDate: '2024-01-01T00:00:00.000Z',
    currentPeriodEndDate: '2024-02-01T00:00:00.000Z',
    canceledAt: null,
    ...overrides,
  }
}
