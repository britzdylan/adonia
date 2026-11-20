import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { sendOutboundRequest } from '#modules/outbound/request'
import { UnsafeUrlError } from '#modules/outbound/url_safety'

type Received = { method?: string; headers: http.IncomingHttpHeaders; body: string }

/** A local receiver. It is on 127.0.0.1, so only `allowPrivate` reaches it. */
async function receiver(handler: (res: http.ServerResponse) => void) {
  const received: Received[] = []
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      received.push({ method: req.method, headers: req.headers, body })
      handler(res)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/hook`,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

test.group('outbound sendOutboundRequest', () => {
  test('refuses a private address and sends nothing', async () => {
    const target = await receiver((res) => res.end())
    try {
      await assert.rejects(
        () => sendOutboundRequest(target.url, { body: '{}', timeoutMs: 1000 }),
        (error: unknown) => error instanceof UnsafeUrlError
      )
      assert.equal(target.received.length, 0)
    } finally {
      await target.close()
    }
  })

  test('with allowPrivate, posts the body and headers and returns the status', async () => {
    const target = await receiver((res) => {
      res.statusCode = 202
      res.end('accepted')
    })
    try {
      const response = await sendOutboundRequest(
        target.url,
        { headers: { 'Content-Type': 'application/json' }, body: '{"a":1}', timeoutMs: 1000 },
        { allowPrivate: true }
      )
      assert.equal(response.status, 202)
      assert.equal(target.received[0].method, 'POST')
      assert.equal(target.received[0].body, '{"a":1}')
      assert.equal(target.received[0].headers['content-type'], 'application/json')
    } finally {
      await target.close()
    }
  })

  test('does not follow a redirect', async () => {
    const target = await receiver((res) => {
      res.statusCode = 302
      res.setHeader('Location', 'http://169.254.169.254/latest/meta-data/')
      res.end()
    })
    try {
      const response = await sendOutboundRequest(
        target.url,
        { body: '{}', timeoutMs: 1000 },
        { allowPrivate: true }
      )
      assert.equal(response.status, 302)
      assert.equal(target.received.length, 1)
    } finally {
      await target.close()
    }
  })

  test('names the timeout when the receiver does not answer', async () => {
    const target = await receiver(() => {})
    try {
      await assert.rejects(
        () =>
          sendOutboundRequest(target.url, { body: '{}', timeoutMs: 100 }, { allowPrivate: true }),
        /did not respond within 100 ms/
      )
    } finally {
      await target.close()
    }
  })
})
