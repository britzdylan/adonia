const modulesConfig: Record<string, { description: string; emits: string[] }> = {
  creem: {
    description: "Creem checkout, portal, invoices, and webhook verification",
    emits: [
    'Creem:CheckoutCreated',
    'Creem:PortalLinkCreated',
    ],
  },
  auth: {
    description: "Email registration, login, verification, password reset",
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
}

export default modulesConfig
