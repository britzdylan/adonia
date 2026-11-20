import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import type { LookupAddress } from 'node:dns'
import {
  assertPublicUrl,
  isPrivateAddress,
  publicOnlyLookup,
  UnsafeUrlError,
} from '#modules/outbound/url_safety'

const resolvesTo =
  (...addresses: string[]) =>
  async () =>
    addresses.map((address) => ({ address }))

test.group('outbound url_safety - isPrivateAddress', () => {
  test('flags private, loopback, link-local and reserved IPv4 addresses', () => {
    for (const address of [
      '0.0.0.0',
      '10.0.0.1',
      '100.64.0.1',
      '127.0.0.1',
      '127.255.255.254',
      '169.254.169.254',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '198.18.0.1',
      '224.0.0.1',
      '255.255.255.255',
    ]) {
      assert.equal(isPrivateAddress(address), true, address)
    }
  })

  test('allows public IPv4 addresses', () => {
    for (const address of ['1.1.1.1', '8.8.8.8', '93.184.216.34', '172.15.0.1', '172.32.0.1']) {
      assert.equal(isPrivateAddress(address), false, address)
    }
  })

  test('flags private IPv6 addresses, including IPv4-mapped ones', () => {
    for (const address of [
      '::',
      '::1',
      'fc00::1',
      'fd12:3456:789a::1',
      'fe80::1',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:7f00:1',
      '::ffff:a9fe:a9fe',
    ]) {
      assert.equal(isPrivateAddress(address), true, address)
    }
  })

  test('allows public IPv6 addresses', () => {
    assert.equal(isPrivateAddress('2606:4700:4700::1111'), false)
    assert.equal(isPrivateAddress('::ffff:8.8.8.8'), false)
  })

  test('treats anything that is not an IP address as unsafe', () => {
    assert.equal(isPrivateAddress('localhost'), true)
    assert.equal(isPrivateAddress(''), true)
  })
})

test.group('outbound url_safety - assertPublicUrl', () => {
  test('accepts a URL whose host resolves to public addresses', async () => {
    await assert.doesNotReject(() =>
      assertPublicUrl('https://hooks.example.com/in', resolvesTo('93.184.216.34'))
    )
  })

  test('rejects literal private and loopback hosts without a DNS lookup', async () => {
    const neverLookup = async () => {
      throw new Error('lookup should not be called for IP literals')
    }
    for (const url of [
      'http://127.0.0.1:3333/api',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/',
      'http://[::1]:6379/',
      'http://[::ffff:127.0.0.1]/',
      // Alternative spellings of 127.0.0.1 that the URL parser normalizes.
      'http://2130706433/',
      'http://0x7f.0.0.1/',
      'http://127.1/',
    ]) {
      await assert.rejects(() => assertPublicUrl(url, neverLookup), /private or internal/)
    }
  })

  test('rejects a hostname that resolves to a private address', async () => {
    await assert.rejects(
      () => assertPublicUrl('https://internal.example.com/', resolvesTo('10.1.2.3')),
      /private or internal/
    )
  })

  test('rejects when any one of several resolved addresses is private', async () => {
    await assert.rejects(
      () => assertPublicUrl('https://mixed.example.com/', resolvesTo('93.184.216.34', '127.0.0.1')),
      /private or internal/
    )
  })

  test('rejects a host that does not resolve', async () => {
    const failing = async () => {
      throw new Error('ENOTFOUND')
    }
    await assert.rejects(
      () => assertPublicUrl('https://nope.invalid/', failing),
      /could not be resolved/
    )
    await assert.rejects(
      () => assertPublicUrl('https://empty.example.com/', resolvesTo()),
      /could not be resolved/
    )
  })

  test('rejects non-http protocols and malformed URLs', async () => {
    await assert.rejects(() => assertPublicUrl('file:///etc/passwd'), /http or https/)
    await assert.rejects(() => assertPublicUrl('ftp://example.com/'), /http or https/)
    await assert.rejects(() => assertPublicUrl('not a url'), /not valid/)
  })

  test('throws UnsafeUrlError', async () => {
    try {
      await assertPublicUrl('http://127.0.0.1/')
      assert.fail('expected assertPublicUrl to throw')
    } catch (error) {
      assert.ok(error instanceof UnsafeUrlError)
    }
  })
})

/** Calls a callback-style lookup and settles with what it reported. */
function runLookup(
  lookup: ReturnType<typeof publicOnlyLookup>,
  hostname: string,
  options: { all?: boolean; family?: number } = {}
) {
  return new Promise<{ address: string | LookupAddress[]; family?: number }>((resolve, reject) =>
    lookup(hostname, options, (error, address, family) =>
      error ? reject(error) : resolve({ address, family })
    )
  )
}

test.group('outbound url_safety - publicOnlyLookup', () => {
  test('hands back the public address it checked', async () => {
    const lookup = publicOnlyLookup(resolvesTo('93.184.216.34'))
    assert.deepEqual(await runLookup(lookup, 'hooks.example.com'), {
      address: '93.184.216.34',
      family: 4,
    })
  })

  test('returns every address when asked for all of them', async () => {
    const lookup = publicOnlyLookup(resolvesTo('93.184.216.34', '2606:4700:4700::1111'))
    const { address } = await runLookup(lookup, 'hooks.example.com', { all: true })
    assert.deepEqual(address, [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ])
  })

  test('picks an address of the requested family', async () => {
    const lookup = publicOnlyLookup(resolvesTo('93.184.216.34', '2606:4700:4700::1111'))
    const { address, family } = await runLookup(lookup, 'hooks.example.com', { family: 6 })
    assert.equal(address, '2606:4700:4700::1111')
    assert.equal(family, 6)
  })

  test('refuses a host whose answer changed to a private address', async () => {
    // The DNS-rebinding case: the URL check saw a public address, but by the
    // time the connection is made the record points inside the network.
    let calls = 0
    const rebinding = async () => [{ address: calls++ === 0 ? '93.184.216.34' : '127.0.0.1' }]
    await assertPublicUrl('https://rebind.example.com/', rebinding)

    const lookup = publicOnlyLookup(rebinding)
    await assert.rejects(() => runLookup(lookup, 'rebind.example.com'), /private or internal/)
  })

  test('reports a host that does not resolve', async () => {
    const lookup = publicOnlyLookup(async () => {
      throw new Error('ENOTFOUND')
    })
    await assert.rejects(() => runLookup(lookup, 'nope.invalid'), /could not be resolved/)
  })
})
