/**
 * CreemService
 *
 * Checkout, customer portal, product→plan resolution, invoices, webhooks.
 * Depends on CreemClient + CreemConfig — no env, no creem_io import.
 */
import ApiService from '#modules/api/service'
import type {
  CreemClient,
  CreemConfig,
  CreemInvoice,
  CreemPlan,
  CreemWebhookHandlers,
} from '#modules/creem/contracts/index'
import '#modules/creem/events'

export class CreemService extends ApiService {
  namespace = 'creem'

  constructor(
    private client: CreemClient,
    private config: CreemConfig
  ) {
    super()
  }

  get defaultPlan(): string {
    return this.config.defaultPlan
  }

  /**
   * Creates a Creem checkout session.
   * Passes userId in metadata so it can be linked on checkout.completed.
   */
  async createCheckout(productId: string, userId: number, userEmail: string): Promise<string> {
    const checkout = await this.client.createCheckout({
      successUrl: this.config.successUrl,
      productId,
      customerEmail: userEmail,
      userId,
    })

    if (!checkout.checkoutUrl) {
      throw new Error('Creem did not return a checkout URL')
    }

    this.emitSafe('Creem:CheckoutCreated', {
      userId,
      productId,
      checkoutUrl: checkout.checkoutUrl,
    })

    return checkout.checkoutUrl
  }

  /**
   * Generates a Creem customer portal link.
   */
  async createPortalLink(creemCustomerId: string): Promise<string> {
    const portal = await this.client.createPortalLink(creemCustomerId)
    this.emitSafe('Creem:PortalLinkCreated', { customerId: creemCustomerId })
    return portal.portalUrl
  }

  /**
   * Maps a Creem product ID to a plan string. Falls back to config.defaultPlan.
   */
  resolveProductPlan(creemProductId: string): CreemPlan {
    return this.config.productPlans[creemProductId] ?? this.config.defaultPlan
  }

  async getLastInvoices(creemCustomerId: string): Promise<CreemInvoice[]> {
    const result = await this.client.listTransactions(creemCustomerId, 3)
    return result.items.filter((t) => t.type === 'invoice')
  }

  /**
   * Delegates to the client webhook handler (signature verification included).
   */
  async handleWebhookEvents(
    rawBody: string,
    signature: string,
    handlers: CreemWebhookHandlers
  ): Promise<void> {
    await this.client.handleWebhookEvents(rawBody, signature, handlers)
  }
}
