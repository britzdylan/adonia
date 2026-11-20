import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import {
  DELIVERY_REF_HEADER,
  createTrackedMessenger,
  deliveryRefFromHeaders,
  sendTracked,
} from '#modules/notification/delivery'
import type { MailDeliveryTracker } from '#modules/notification/contracts/index'

class RecordingTracker implements MailDeliveryTracker {
  sentRefs: string[] = []
  failedRefs: Array<{ ref: string; error: string }> = []
  throwOnSent = false
  async sent(ref: string) {
    if (this.throwOnSent) throw new Error('db down')
    this.sentRefs.push(ref)
  }
  async failed(ref: string, error: string) {
    this.failedRefs.push({ ref, error })
  }
}

const noSleep = async () => {}

test.group('notification delivery', () => {
  test('reads the reference from headers in any letter case', () => {
    assert.equal(deliveryRefFromHeaders({ [DELIVERY_REF_HEADER]: 'order:1' }), 'order:1')
    assert.equal(deliveryRefFromHeaders({ 'x-delivery-ref': 'order:2' }), 'order:2')
    assert.equal(deliveryRefFromHeaders({ 'X-Other': 'x' }), null)
    assert.equal(deliveryRefFromHeaders(undefined), null)
    assert.equal(deliveryRefFromHeaders({ [DELIVERY_REF_HEADER]: '' }), null)
  })

  test('records a send that works after a retry', async () => {
    const tracker = new RecordingTracker()
    let calls = 0
    await sendTracked(
      async () => {
        if (++calls === 1) throw new Error('smtp busy')
      },
      'order:1',
      tracker,
      { sleep: noSleep }
    )
    assert.equal(calls, 2)
    assert.deepEqual(tracker.sentRefs, ['order:1'])
    assert.equal(tracker.failedRefs.length, 0)
  })

  test('records one failure after the last attempt and throws', async () => {
    const tracker = new RecordingTracker()
    let calls = 0
    await assert.rejects(
      () =>
        sendTracked(
          async () => {
            calls++
            throw new Error('smtp down')
          },
          'order:1',
          tracker,
          { attempts: 3, sleep: noSleep }
        ),
      /smtp down/
    )
    assert.equal(calls, 3)
    assert.deepEqual(tracker.failedRefs, [{ ref: 'order:1', error: 'smtp down' }])
  })

  test('a tracker error does not send the email again', async () => {
    const tracker = new RecordingTracker()
    tracker.throwOnSent = true
    const errors: unknown[] = []
    let calls = 0
    await sendTracked(
      async () => {
        calls++
      },
      'order:1',
      tracker,
      {
        sleep: noSleep,
        onError: (e) => errors.push(e),
      }
    )
    assert.equal(calls, 1)
    assert.equal(errors.length, 1)
  })

  test('the messenger returns at once and sends in the background', async () => {
    const tracker = new RecordingTracker()
    const sent: unknown[] = []
    const messenger = createTrackedMessenger(
      { sendCompiled: async (mail) => void sent.push(mail) },
      tracker,
      { sleep: noSleep }
    )
    const mail = { message: { headers: { [DELIVERY_REF_HEADER]: 'order:9' } } }
    await messenger.queue(mail)
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(sent, [mail])
    assert.deepEqual(tracker.sentRefs, ['order:9'])
  })
})
