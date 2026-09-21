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
