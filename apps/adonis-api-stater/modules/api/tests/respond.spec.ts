import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import type { HttpContext } from '@adonisjs/core/http'
import { respond } from '#modules/api/provider'
import { prepareError } from '#modules/api/envelope'

test.group('ctx.respond error status', () => {
  test('sets HTTP status from ApiErrorBody', async () => {
    let statusCode = 200
    const ctx = {
      response: {
        status(code: number) {
          statusCode = code
          return this
        },
      },
    } as unknown as HttpContext

    const body = prepareError('E_X', 409)
    const result = await respond.call(ctx, body)

    assert.equal(statusCode, 409)
    assert.deepEqual(result, { success: false, message: 'E_X', status: 409 })
  })

  test('defaults to 400 when status is omitted', async () => {
    let statusCode = 200
    const ctx = {
      response: {
        status(code: number) {
          statusCode = code
          return this
        },
      },
    } as unknown as HttpContext

    await respond.call(ctx, prepareError('E_X'))
    assert.equal(statusCode, 400)
  })
})

test.group('ctx.respond payload serialization', () => {
  const ctx = { containerResolver: undefined } as unknown as HttpContext

  test('passes a null payload through', async () => {
    const result = await respond.call(ctx, { success: true, message: 'M_X', data: null })
    assert.deepEqual(result, { success: true, message: 'M_X', data: null })
  })

  test('serializes Lucid rows instead of exposing their internals', async () => {
    const row = {
      $attributes: { id: 1, password: 'hash' },
      $original: { id: 1, password: 'hash' },
      serialize() {
        return { email: 'a@test.com' }
      },
    }

    const single = await respond.call(ctx, { success: true, message: null, data: row })
    assert.deepEqual(single, { success: true, message: null, data: { email: 'a@test.com' } })

    const list = await respond.call(ctx, { success: true, message: null, data: [row, row] })
    assert.deepEqual(list, {
      success: true,
      message: null,
      data: [{ email: 'a@test.com' }, { email: 'a@test.com' }],
    })
  })

  test('keeps plain DTO payloads intact', async () => {
    const result = await respond.call(ctx, {
      success: true,
      message: null,
      data: { id: 1, tags: ['a'] },
    })
    assert.deepEqual(result, { success: true, message: null, data: { id: 1, tags: ['a'] } })
  })
})
