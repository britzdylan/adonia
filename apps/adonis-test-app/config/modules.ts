const modulesConfig: Record<string, { description: string; emits: string[] }> = {
  creem: {
    description: "Creem checkout, portal, invoices, and webhook verification",
    emits: [
    'Creem:CheckoutCreated',
    'Creem:PortalLinkCreated',
    ],
  },
}

export default modulesConfig
