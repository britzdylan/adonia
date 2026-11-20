import { BlockList, isIP } from 'node:net'
import type { LookupFunction } from 'node:net'
import { lookup as dnsLookup } from 'node:dns/promises'

/**
 * Guards outbound requests to user-supplied URLs (webhooks, callbacks, link
 * previews) against server-side request forgery: a URL that points at this
 * host, the private network, or a cloud metadata endpoint must never be
 * requested on a user's behalf.
 *
 * No Adonis or env imports: pass options in from the host.
 */

const blocked = new BlockList()

// IPv4: "this" network, private ranges, loopback, link-local (incl. cloud
// metadata at 169.254.169.254), carrier-grade NAT, benchmarking, multicast and
// reserved space.
blocked.addSubnet('0.0.0.0', 8, 'ipv4')
blocked.addSubnet('10.0.0.0', 8, 'ipv4')
blocked.addSubnet('100.64.0.0', 10, 'ipv4')
blocked.addSubnet('127.0.0.0', 8, 'ipv4')
blocked.addSubnet('169.254.0.0', 16, 'ipv4')
blocked.addSubnet('172.16.0.0', 12, 'ipv4')
blocked.addSubnet('192.0.0.0', 24, 'ipv4')
blocked.addSubnet('192.168.0.0', 16, 'ipv4')
blocked.addSubnet('198.18.0.0', 15, 'ipv4')
blocked.addSubnet('224.0.0.0', 3, 'ipv4')

// IPv6: unspecified, loopback, unique-local, link-local, multicast.
blocked.addAddress('::', 'ipv6')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')
blocked.addSubnet('ff00::', 8, 'ipv6')

const MAPPED_IPV4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i
const MAPPED_IPV4_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i

/**
 * True when the address is one a public URL must not resolve to.
 * Anything that is not a valid IP address is treated as unsafe.
 */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return blocked.check(address, 'ipv4')
  if (family !== 6) return true

  // IPv4-mapped IPv6 (::ffff:10.0.0.1 or ::ffff:a00:1) reaches the IPv4 host.
  const dotted = MAPPED_IPV4.exec(address)
  if (dotted) return isPrivateAddress(dotted[1])
  const hex = MAPPED_IPV4_HEX.exec(address)
  if (hex) {
    const high = Number.parseInt(hex[1], 16)
    const low = Number.parseInt(hex[2], 16)
    return isPrivateAddress(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`)
  }

  return blocked.check(address, 'ipv6')
}

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

export type Lookup = (hostname: string) => Promise<Array<{ address: string; family?: number }>>

const defaultLookup: Lookup = (hostname) => dnsLookup(hostname, { all: true })

export interface ResolvedAddress {
  address: string
  family: 4 | 6
}

/**
 * Resolves a hostname and returns its addresses, or throws UnsafeUrlError when
 * it does not resolve or any one of its addresses is private.
 */
export async function resolvePublicAddresses(
  hostname: string,
  lookup: Lookup = defaultLookup
): Promise<ResolvedAddress[]> {
  let addresses: string[]
  if (isIP(hostname)) {
    addresses = [hostname]
  } else {
    try {
      const resolved = await lookup(hostname)
      addresses = resolved.map((entry) => entry.address)
    } catch {
      throw new UnsafeUrlError('URL host could not be resolved')
    }
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError('URL host could not be resolved')
  }
  if (addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError('URL points to a private or internal address')
  }
  return addresses.map((address) => ({ address, family: isIP(address) === 6 ? 6 : 4 }))
}

/**
 * Throws UnsafeUrlError unless the URL is http(s) and every address its host
 * resolves to is public.
 *
 * This checks the URL, not the connection: the HTTP client resolves the host
 * again. Pair it with `publicOnlyLookup` on the request so a DNS record that
 * changes between the two lookups cannot reach an internal address.
 */
export async function assertPublicUrl(rawUrl: string, lookup: Lookup = defaultLookup) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError('URL is not valid')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('URL must use http or https')
  }

  // URL keeps the brackets around IPv6 literals.
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname) throw new UnsafeUrlError('URL has no host')

  await resolvePublicAddresses(hostname, lookup)
}

/**
 * A `lookup` for `node:http` / `node:net` that only hands back public
 * addresses. The socket connects to the address this function returns, so the
 * address that was checked is the address that is used: a DNS answer cannot
 * switch to an internal one between the check and the connection.
 *
 * Node does not call `lookup` for IP-literal hosts; `assertPublicUrl` covers
 * those before the request is made.
 */
export function publicOnlyLookup(lookup: Lookup = defaultLookup): LookupFunction {
  return (hostname, options, callback) => {
    resolvePublicAddresses(hostname, lookup).then(
      (resolved) => {
        if (options.all) {
          callback(null, resolved)
          return
        }
        const family =
          options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : options.family || 0
        const match = resolved.find((r) => !family || r.family === family)
        if (!match) {
          callback(new UnsafeUrlError('URL host could not be resolved'), '', 0)
          return
        }
        callback(null, match.address, match.family)
      },
      (error: Error) => callback(error, '', 0)
    )
  }
}
