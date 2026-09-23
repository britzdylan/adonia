/**
 * Host Lucid factory for subscriptions. Copied to app/adapters/subscription.ts.
 * Import as `#adapters/subscription`.
 */
import { SubscriptionService } from '#modules/subscription/service'
import { LucidSubscriptionStore } from './lucid_subscription_store.ts'
import type { CreemService } from '#modules/creem/service'
import type {
  SubscriptionConfig,
  SubscriptionStore,
} from '#modules/subscription/contracts/index'

export { LucidSubscriptionStore } from './lucid_subscription_store.ts'

export function createSubscriptionService(
  creem: CreemService,
  store: SubscriptionStore = new LucidSubscriptionStore(),
  config: SubscriptionConfig = {}
) {
  return new SubscriptionService(store, creem, config)
}
