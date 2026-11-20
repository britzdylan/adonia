import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { NotificationService } from '#modules/notification/service'
import { PreferenceAwareNotificationService } from '#modules/notification/preferences'
import { MemoryMailTransport } from '#modules/notification/tests/fakes/memory_mail_transport'
import { MemoryAppNotificationStore } from '#modules/notification/tests/fakes/memory_app_notification_store'
import type {
  NotificationPreferenceStore,
  NotificationRegistry,
} from '#modules/notification/contracts/index'

const registry = {
  digest: {
    email: (p: Record<string, any>) => ({ to: p.email }),
    app: (p: Record<string, any>) => ({ userId: p.userId, type: 'digest', title: 'T', body: 'B' }),
  },
  reset_password: {
    email: (p: Record<string, any>) => ({ to: p.email }),
  },
} as const satisfies NotificationRegistry

class MapPreferenceStore implements NotificationPreferenceStore {
  lookups = 0
  fail = false
  constructor(private values: Record<number, Record<string, boolean>>) {}
  async isEnabled(userId: number, preference: string) {
    this.lookups++
    if (this.fail) throw new Error('database down')
    return this.values[userId]?.[preference] === true
  }
}

function make(values: Record<number, Record<string, boolean>> = {}) {
  const mail = new MemoryMailTransport()
  const app = new MemoryAppNotificationStore()
  const store = new MapPreferenceStore(values)
  const warnings: string[] = []
  const errors: unknown[] = []
  const service = new PreferenceAwareNotificationService(
    new NotificationService(registry, mail, app),
    store,
    { digest: 'emailDigest', reset_password: null },
    { onWarn: (m) => warnings.push(m), onError: (_c, _t, e) => errors.push(e) }
  )
  return { service, mail, app, store, warnings, errors }
}

test.group('PreferenceAwareNotificationService', () => {
  test('a type that is not in the registry is a compile-time error', async () => {
    const { service } = make()
    // @ts-expect-error typo is not a registry key
    await service.send('typo', ['email'], {})
  })

  test('sends a governed email when the preference is on', async () => {
    const { service, mail } = make({ 1: { emailDigest: true } })
    const result = await service.send('digest', ['email'], { userId: 1, email: 'a@test.com' })
    assert.equal(result.email, 'sent')
    assert.equal(mail.messages.length, 1)
  })

  test('drops only the email channel when the preference is off', async () => {
    const { service, mail, app } = make({ 1: { emailDigest: false } })
    const result = await service.send('digest', ['email', 'app'], {
      userId: 1,
      email: 'a@test.com',
    })
    assert.deepEqual(result, { email: 'skipped', app: 'sent' })
    assert.equal(mail.messages.length, 0)
    assert.equal(app.rows.length, 1)
  })

  test('always sends an ungoverned email without a lookup', async () => {
    const { service, mail, store } = make()
    const result = await service.send('reset_password', ['email'], { email: 'a@test.com' })
    assert.equal(result.email, 'sent')
    assert.equal(mail.messages.length, 1)
    assert.equal(store.lookups, 0)
  })

  test('does not send a governed email without a numeric userId', async () => {
    const { service, mail, warnings } = make({ 1: { emailDigest: true } })
    const result = await service.send('digest', ['email'], { userId: '1', email: 'a@test.com' })
    assert.equal(result.email, 'skipped')
    assert.equal(mail.messages.length, 0)
    assert.equal(warnings.length, 1)
  })

  test('does not send a governed email when the lookup fails', async () => {
    const { service, mail, store, errors } = make({ 1: { emailDigest: true } })
    store.fail = true
    const result = await service.send('digest', ['email'], { userId: 1, email: 'a@test.com' })
    assert.equal(result.email, 'skipped')
    assert.equal(mail.messages.length, 0)
    assert.equal(errors.length, 1)
  })
})
