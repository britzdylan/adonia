/**
 * Default CreemClient backed by creem_io.
 */
import { createCreem } from 'creem_io'
import type { WebhookOptions } from 'creem_io'
import type {
  CreemClient,
  CreemClientOptions,
  CreemWebhookHandlers,
} from '#modules/creem/contracts/index'

export class CreemIoClient implements CreemClient {
  private client: ReturnType<typeof createCreem>

  constructor(options: CreemClientOptions) {
    this.client = createCreem({
      apiKey: options.apiKey,
      webhookSecret: options.webhookSecret,
      testMode: options.testMode,
    })
  }

  async createCheckout(input: {
    successUrl: string
    productId: string
    customerEmail: string
    userId: number
  }) {
    const checkout = await this.client.checkouts.create({
      successUrl: input.successUrl,
      productId: input.productId,
      customer: { email: input.customerEmail },
      metadata: { userId: String(input.userId) },
    })

    return { checkoutUrl: checkout.checkoutUrl }
  }

  async createPortalLink(customerId: string) {
    const portal = await this.client.customers.createPortal({ customerId })
    return { portalUrl: portal.customerPortalLink }
  }

  async listTransactions(customerId: string, limit: number) {
    const result = await this.client.transactions.list({ customerId, limit })
    return {
      items: result.items.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt,
      })),
    }
  }

  async handleWebhookEvents(
    rawBody: string,
    signature: string,
    handlers: CreemWebhookHandlers
  ) {
    await this.client.webhooks.handleEvents(
      rawBody,
      signature,
      handlers as Omit<WebhookOptions, 'webhookSecret'>
    )
  }
}
