import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { InboxService } from '#modules/notification/inbox'
import { MemoryAppNotificationStore } from '#modules/notification/tests/fakes/memory_app_notification_store'

async function make() {
  const store = new MemoryAppNotificationStore()
  for (const [userId, title] of [
    [1, 'first'],
    [1, 'second'],
    [2, 'other user'],
  ] as const) {
    await store.create({ userId, type: 'note', title, body: 'body' })
  }
  const readAt = new Date('2026-01-01T00:00:00Z')
  const service = new InboxService(store, { pageSize: 50 }, () => readAt)
  return { store, service, readAt }
}

test.group('InboxService', () => {
  test('lists only the user unread notifications, newest first', async () => {
    const { service } = await make()
    const inbox = await service.getInbox(1)
    assert.equal(inbox.unreadCount, 2)
    assert.deepEqual(
      inbox.notifications.map((n) => n.title),
      ['second', 'first']
    )
  })

  test('marks one notification read', async () => {
    const { service, readAt } = await make()
    const before = await service.getInbox(1)
    const marked = await service.markRead(1, before.notifications[0].id)
    assert.deepEqual(marked.readAt, readAt)
    const after = await service.getInbox(1)
    assert.equal(after.unreadCount, 1)
  })

  test("refuses another user's notification", async () => {
    const { service } = await make()
    const theirs = await service.getInbox(2)
    await assert.rejects(
      () => service.markRead(1, theirs.notifications[0].id),
      (err: any) => err.code === 'E_NOTIFICATION_NOT_FOUND' && err.status === 404
    )
    const after = await service.getInbox(2)
    assert.equal(after.unreadCount, 1)
  })

  test('marks all of the user notifications read and no others', async () => {
    const { service } = await make()
    assert.equal(await service.markAllRead(1), 2)
    const mine = await service.getInbox(1)
    const theirs = await service.getInbox(2)
    assert.equal(mine.unreadCount, 0)
    assert.equal(theirs.unreadCount, 1)
  })
})
