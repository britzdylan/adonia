/**
 * Sends an HTTP request to a user-supplied URL without letting it reach the
 * private network.
 *
 * Uses `node:http` rather than `fetch` because `fetch` cannot be given a
 * `lookup`, and the lookup is how the address that was checked against the
 * private ranges becomes the address that is connected to (see
 * `publicOnlyLookup`). Redirects are not followed, since one could lead to an
 * internal address; a 3xx is returned like any other status. No agent is
 * shared, so every request resolves and checks afresh.
 */
import http from 'node:http'
import https from 'node:https'
import type { LookupFunction } from 'node:net'
import { assertPublicUrl, publicOnlyLookup, type Lookup } from '#modules/outbound/url_safety'

export type OutboundRequest = {
  /** Default POST. */
  method?: string
  headers?: Record<string, string>
  body?: string
  /** Abort after this many milliseconds. */
  timeoutMs: number
}

export type OutboundResponse = {
  status: number
  statusText: string
}

export type OutboundOptions = {
  /**
   * Skip the private-address checks. Only for local development and tests,
   * for example a webhook receiver on localhost. Never in production.
   */
  allowPrivate?: boolean
  /** DNS lookup, for tests. Defaults to the system resolver. */
  lookup?: Lookup
}

/**
 * Checks the URL, then sends the request to the address that was checked.
 * Throws `UnsafeUrlError` for a URL that is not http(s), does not resolve or
 * resolves to a private address. Resolves with the status of any response,
 * including 3xx, 4xx and 5xx; rejects on network errors and timeouts.
 */
export async function sendOutboundRequest(
  url: string,
  request: OutboundRequest,
  options: OutboundOptions = {}
): Promise<OutboundResponse> {
  if (options.allowPrivate) {
    return sendPinned(url, request)
  }
  await assertPublicUrl(url, options.lookup)
  return sendPinned(url, request, publicOnlyLookup(options.lookup))
}

/**
 * The request itself. `lookup` decides which address the socket connects
 * to; without one the system resolver is used and no address is checked.
 */
export function sendPinned(
  url: string,
  request: OutboundRequest,
  lookup?: LookupFunction
): Promise<OutboundResponse> {
  const target = new URL(url)
  const client = target.protocol === 'https:' ? https : http
  const signal = AbortSignal.timeout(request.timeoutMs)
  const headers: Record<string, string | number> = { ...request.headers }
  if (request.body !== undefined) {
    headers['Content-Length'] = Buffer.byteLength(request.body)
  }

  return new Promise((resolve, reject) => {
    const req = client.request(
      target,
      { method: request.method ?? 'POST', headers, agent: false, lookup, signal },
      (res) => {
        // Only the status is used; drain the body so the socket is released.
        res.resume()
        resolve({ status: res.statusCode ?? 0, statusText: res.statusMessage ?? '' })
      }
    )
    // Name the timeout rather than Node's generic "The operation was aborted",
    // since this message is often shown to the user on a failed delivery.
    req.on('error', (error) =>
      reject(
        signal.aborted
          ? new Error(`Request did not respond within ${request.timeoutMs} ms`, { cause: error })
          : error
      )
    )
    req.end(request.body)
  })
}
