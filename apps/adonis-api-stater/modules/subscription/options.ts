/**
 * Host-editable defaults for SubscriptionService.
 */
export type SubscriptionOptions = {
  /** Statuses treated as entitled. */
  activeStatuses: string[]
}

export const defaultSubscriptionOptions: SubscriptionOptions = {
  activeStatuses: ['active', 'trialing', 'scheduled_cancel'],
}

/** @deprecated Prefer defaultSubscriptionOptions.activeStatuses */
export const DEFAULT_ACTIVE_STATUSES = defaultSubscriptionOptions.activeStatuses
