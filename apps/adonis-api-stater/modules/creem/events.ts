/**
 * Creem module events. Import this file so the EventsList augmentation loads.
 */
declare module '@adonisjs/core/types' {
  interface EventsList {
    'Creem:CheckoutCreated': { userId: number; productId: string; checkoutUrl: string }
    'Creem:PortalLinkCreated': { customerId: string }
  }
}
