/**
 * Subscription module events. Import this file so the EventsList augmentation loads.
 */
declare module '@adonisjs/core/types' {
  interface EventsList {
    'Subscription:Activated': { userId: number }
    'Subscription:Revoked': { userId: number }
    'Subscription:Canceled': { userId: number }
    'Subscription:ScheduledCancel': { userId: number }
    'Subscription:Updated': { userId: number }
    'Subscription:RefundCreated': { refundId: string }
  }
}
