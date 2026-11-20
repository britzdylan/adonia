import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { sanitizeObject, sanitizeString, sanitizeValue } from '#modules/sanitize/sanitize'

test.group('sanitizeString', () => {
  test('keeps clean text and trims it', () => {
    assert.equal(sanitizeString('  Hello world  '), 'Hello world')
  })

  test('strips tags, and script content with its tag', () => {
    assert.equal(sanitizeString('<b>bold</b>'), 'bold')
    assert.equal(sanitizeString('<div><p>text</p></div>'), 'text')
    assert.equal(sanitizeString('<b>unclosed'), 'unclosed')
    assert.equal(sanitizeString('<script>alert("xss")</script>'), '')
    assert.equal(sanitizeString('<img src=x onerror=alert(1)>hi'), 'hi')
  })

  test('leaves encoded entities as text', () => {
    assert.equal(sanitizeString('&lt;b&gt;'), '&lt;b&gt;')
  })

  test('cuts to maxStringLength', () => {
    assert.equal(sanitizeString('a'.repeat(10_001)).length, 10_000)
    assert.equal(sanitizeString('abcdef', { maxStringLength: 3 }), 'abc')
  })
})

test.group('sanitizeValue', () => {
  test('sanitizes strings in objects and arrays at any position', () => {
    assert.deepEqual(
      sanitizeValue({
        name: '<b>Ada</b>',
        tags: ['<i>one</i>', ['<u>nested</u>']],
        items: [{ label: '<em>x</em>' }],
      }),
      { name: 'Ada', tags: ['one', ['nested']], items: [{ label: 'x' }] }
    )
  })

  test('keeps numbers, booleans and null; dates become ISO strings', () => {
    assert.deepEqual(
      sanitizeValue({ n: 42, b: true, z: null, d: new Date('2026-01-01T00:00:00Z') }),
      { n: 42, b: true, z: null, d: '2026-01-01T00:00:00.000Z' }
    )
  })

  test('sanitizes keys and drops __proto__', () => {
    const input = JSON.parse('{"<b>k</b>": 1, "__proto__": {"admin": true}}')
    const result = sanitizeObject(input)
    assert.deepEqual(result, { k: 1 })
    assert.equal(({} as Record<string, unknown>).admin, undefined)
  })

  test('drops values past maxDepth instead of returning them unsanitized', () => {
    const deep = { a: { b: { c: { d: { e: { f: '<b>deep</b>' } } } } } }
    const result = sanitizeObject(deep) as any
    assert.deepEqual(result.a.b.c.d, {})
    assert.equal(JSON.stringify(result).includes('<b>'), false)
  })

  test('keeps at most maxKeys entries', () => {
    const many = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`k${i}`, i]))
    assert.deepEqual(Object.keys(sanitizeObject(many, { maxKeys: 2 })), ['k0', 'k1'])
  })

  test('turns functions and undefined into null', () => {
    assert.deepEqual(sanitizeValue({ f: () => 1, u: undefined }), { f: null, u: null })
  })
})
