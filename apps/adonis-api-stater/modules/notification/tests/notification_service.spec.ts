import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { NotificationService } from '#modules/notification/service'
import { createNotificationService } from '#modules/notification/adapters/index'
import { MemoryMailTransport } from '#modules/notification/tests/fakes/memory_mail_transport'
import { MemoryAppNotificationStore } from '#modules/notification/tests/fakes/memory_app_notification_store'
import type { NotificationRegistry } from '#modules/notification/contracts/index'

const registry = {
  welcome: {
    email: (p: Record<string, any>) => ({ to: p.email, template: 'welcome' }),
  },
  new_submission: {
    email: (p: Record<string, any>) => ({ to: p.email }),
    app: (p: Record<string, any>) => ({
      userId: p.userId,
      type: 'new_submission',
      title: 'New',
      body: 'Body',
    }),
  },
} as const satisfies NotificationRegistry

test.group('NotificationService', () => {
  test('send typo is a compile-time error when using a typed registry', async () => {
    const mail = new MemoryMailTransport()
    const app = new MemoryAppNotificationStore()
    const service = createNotificationService(registry, { mail, appNotifications: app })

    // @ts-expect-error typo is not a registry key
    await service.send('typo', ['email'], {})

    const status = await service.send('welcome', ['email'], { email: 'a@test.com' })
    assert.equal(status.email, 'sent')
    assert.equal(status.app, 'skipped')
  })

  test('throwing MailTransport calls onError and returns email failed', async () => {
    const mail = new MemoryMailTransport()
    mail.throwOnSend = true
    const errors: Array<{ channel: string; type: string }> = []
    const service = new NotificationService(registry, mail, new MemoryAppNotificationStore(), {
      onError: (channel, type) => errors.push({ channel, type }),
    })

    const status = await service.send('welcome', ['email'], { email: 'a@test.com' })
    assert.equal(status.email, 'failed')
    assert.deepEqual(errors, [{ channel: 'email', type: 'welcome' }])
  })

  test('dispatches to both channels', async () => {
    const mail = new MemoryMailTransport()
    const app = new MemoryAppNotificationStore()
    const service = createNotificationService(registry, { mail, appNotifications: app })
    const status = await service.send('new_submission', ['email', 'app'], {
      email: 'a@test.com',
      userId: 1,
    })
    assert.equal(status.email, 'sent')
    assert.equal(status.app, 'sent')
    assert.equal(mail.messages.length, 1)
    assert.equal(app.rows.length, 1)
  })
})
