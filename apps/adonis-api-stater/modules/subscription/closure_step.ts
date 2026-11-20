/**
 * Account closure step that cancels billing first.
 *
 * Pass it to the account module's `createAccountService` (or the
 * AccountService constructor) so `closeAccount` refuses to delete an
 * account while one of its subscriptions can still charge the user.
 * The return value fits the account module's `AccountClosureStep`; this
 * file does not import the account module.
 */
import type { SubscriptionService } from '#modules/subscription/service'

export function cancelSubscriptionsOnClose(
  subscriptions: Pick<SubscriptionService, 'cancelAllForUser'>
) {
  return {
    name: 'subscriptions',
    async run(user: { id: number }): Promise<void> {
      await subscriptions.cancelAllForUser(user.id)
    },
  }
}
