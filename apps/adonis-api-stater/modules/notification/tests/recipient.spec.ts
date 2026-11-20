import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import { formatMailAddress, toMailRecipient } from '#modules/notification/recipient'

test.group('notification recipient', () => {
  test('joins first and last name, or gives null', () => {
    assert.deepEqual(
      toMailRecipient({ email: 'a@test.com', firstName: ' Ada ', lastName: 'Lovelace' }),
      { email: 'a@test.com', name: 'Ada Lovelace' }
    )
    assert.deepEqual(toMailRecipient({ email: 'a@test.com', firstName: '', lastName: null }), {
      email: 'a@test.com',
      name: null,
    })
  })

  test('formats an address and escapes the name', () => {
    assert.equal(formatMailAddress({ email: 'a@test.com', name: null }), 'a@test.com')
    assert.equal(
      formatMailAddress({ email: 'a@test.com', name: 'Ada "A" \\ L\r\nBcc: x@evil.test' }),
      '"Ada \\"A\\" \\\\ L Bcc: x@evil.test" <a@test.com>'
    )
  })
})
