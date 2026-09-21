/**
 * Host-editable defaults for AccountService.
 */
export type AccountOptions = {
  /** Duration passed to encryption.encrypt for pending-email tokens. */
  emailChangeTtl: string
}

export const defaultAccountOptions: AccountOptions = {
  emailChangeTtl: '2 Hours',
}
