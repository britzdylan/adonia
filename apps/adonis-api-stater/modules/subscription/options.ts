/**
 * Host-editable defaults for SubscriptionService.
 */
export type SubscriptionOptions = {
  /** Statuses treated as entitled. */
  activeStatuses: string[]
  /** Statuses after which a subscription can no longer charge the user. */
  endedStatuses: string[]
}

export const defaultSubscriptionOptions: SubscriptionOptions = {
  activeStatuses: ['active', 'trialing', 'scheduled_cancel'],
  endedStatuses: ['canceled', 'expired'],
}

/** @deprecated Prefer defaultSubscriptionOptions.activeStatuses */
export const DEFAULT_ACTIVE_STATUSES = defaultSubscriptionOptions.activeStatuses
