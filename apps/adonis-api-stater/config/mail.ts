import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

const mailConfig = defineConfig({
  default: 'smtp',
  from: {
    address: 'noreply@example.com',
    name: 'Adonia',
  },
  mailers: {
    smtp: transports.smtp({
      host: '127.0.0.1',
      port: 1025,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
