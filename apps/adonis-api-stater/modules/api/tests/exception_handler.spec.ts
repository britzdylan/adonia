import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import type { HttpContext } from '@adonisjs/core/http'
import HttpExceptionHandler from '#modules/api/exception_handler'
import ApiException from '#modules/api/exception'
import { exceptions } from '#constants/exceptions'

type Captured = { status?: number; body?: unknown; headers: Record<string, unknown> }

function fakeCtx(): { ctx: HttpContext; out: Captured } {
  const out: Captured = { headers: {} }
  const response = {
    status(code: number) {
      out.status = code
      return response
    },
    header(name: string, value: unknown) {
      out.headers[name] = value
      return response
    },
    json(body: unknown) {
      out.body = body
      return body
    },
  }
  return { ctx: { response } as unknown as HttpContext, out }
}

test.group('HttpExceptionHandler self-handled package errors', () => {
  test('renders invalid credentials through the envelope', async () => {
    const handler = new HttpExceptionHandler()
    const { ctx, out } = fakeCtx()
    const error = Object.assign(new Error('Invalid user credentials'), {
      code: 'E_INVALID_CREDENTIALS',
      status: 400,
      handle() {
        throw new Error('the package renderer must not run')
      },
    })

    await handler.handle(error, ctx)

    assert.equal(out.status, 400)
    assert.deepEqual(out.body, { success: false, message: 'E_INVALID_CREDENTIALS', status: 400 })
  })

  test('keeps the rate-limit headers', async () => {
    const handler = new HttpExceptionHandler()
    const { ctx, out } = fakeCtx()
    const error = Object.assign(new Error('Too many requests'), {
      code: 'E_TOO_MANY_REQUESTS',
      status: 429,
      getDefaultHeaders: () => ({ 'Retry-After': 60, 'X-RateLimit-Limit': 5 }),
      handle() {},
    })

    await handler.handle(error, ctx)

    assert.equal(out.status, 429)
    assert.equal(out.headers['Retry-After'], '60')
    assert.equal(out.headers['X-RateLimit-Limit'], '5')
    assert.deepEqual(out.body, { success: false, message: 'E_TOO_MANY_REQUESTS', status: 429 })
  })
})

test.group('HttpExceptionHandler ApiException data', () => {
  test('puts data next to the code', async () => {
    const handler = new HttpExceptionHandler()
    const { ctx, out } = fakeCtx()

    await handler.renderErrorAsJSON(
      ApiException.withData(exceptions.FORBIDDEN, { reason: 'paused' }),
      ctx
    )

    assert.equal(out.status, 403)
    assert.deepEqual(out.body, {
      success: false,
      message: 'E_FORBIDDEN',
      status: 403,
      data: { reason: 'paused' },
    })
  })

  test('leaves data out when the exception has none', async () => {
    const handler = new HttpExceptionHandler()
    const { ctx, out } = fakeCtx()

    await handler.renderErrorAsJSON(ApiException.from(exceptions.FORBIDDEN), ctx)

    assert.deepEqual(out.body, { success: false, message: 'E_FORBIDDEN', status: 403 })
  })
})

test.group('HttpExceptionHandler validation codes', () => {
  const validationError = (message: string) =>
    Object.assign(new Error('Validation failure'), {
      status: 422,
      code: 'E_VALIDATION_ERROR',
      messages: [{ field: 'email', message, rule: 'email' }],
    })

  test('collapses a Vine sentence to the generic code', async () => {
    const handler = new HttpExceptionHandler()
    const { ctx, out } = fakeCtx()

    await handler.renderValidationErrorAsJSON(
      validationError('The email field must be a valid email address'),
      ctx
    )

    const body = out.body as { message: string; errors: unknown[] }
    assert.equal(out.status, 422)
    assert.equal(body.message, 'E_VALIDATION_ERROR')
    assert.equal(body.errors.length, 1)
  })

  test('passes a specific validation code through', async () => {
    const handler = new HttpExceptionHandler()
    const { ctx, out } = fakeCtx()

    await handler.renderValidationErrorAsJSON(validationError('E_VALIDATION_ERROR_UNSAFE_URL'), ctx)

    assert.equal((out.body as { message: string }).message, 'E_VALIDATION_ERROR_UNSAFE_URL')
  })
})
