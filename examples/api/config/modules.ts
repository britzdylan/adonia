import type { ModelsTypes } from '#modules/types'

const modulesConfig: Record<string, ModelsTypes.ModuleActionConfig> = {
  auth: {
    description: 'Registration, login, verification, password reset',
    emits: [
      'Auth:RegisterUser',
      'Auth:CreateNewVerificationToken',
      'Auth:ActivateUserAccount',
      'Auth:RequestPasswordReset',
      'Auth:ResetPassword',
      'Auth:Login',
      'Auth:Logout',
    ],
  },
  account: {
    description: 'Profile, email, password, deletion',
    emits: [
      'Account:UpdateUserProfile',
      'Account:UpdateUserEmail',
      'Account:ConfirmEmailChange',
      'Account:UpdateUserPassword',
      'Account:DeleteAccount',
    ],
  },
  creem: {
    description: 'Creem checkout and portal',
    emits: ['Creem:CheckoutCreated', 'Creem:PortalLinkCreated'],
  },
  subscription: {
    description: 'Subscription state from Creem webhooks',
    emits: [
      'Subscription:Activated',
      'Subscription:Revoked',
      'Subscription:Canceled',
      'Subscription:ScheduledCancel',
      'Subscription:Updated',
      'Subscription:RefundCreated',
    ],
  },
}

export default modulesConfig
