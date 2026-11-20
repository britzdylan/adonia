import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { prepareError } from '#modules/api/envelope'
import ApiException from '#modules/api/exception'

type HttpError = Parameters<ExceptionHandler['renderErrorAsJSON']>[0]

/**
 * Shape of a package error that renders itself (it has its own `handle`)
 * and that the API handler renders through the envelope instead.
 */
type SelfHandledError = {
  status?: number
  code?: string
  headers?: Record<string, unknown>
  getDefaultHeaders?: () => Record<string, unknown>
}

const VALIDATION_ERROR = 'E_VALIDATION_ERROR'

/**
 * Global API exception handler.
 *
 * Overrides JSON renderers so Adonis package errors, validation errors, and
 * ApiException all share one envelope. Clients read `message` as a code, so
 * the envelope never carries a sentence in `message`.
 */
export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * Youch debug payloads are unused for this API (force_json middleware).
   * Always emit the envelope so clients get a stable shape in every environment.
   */
  protected debug = false

  /**
   * Client errors are expected; skip noisy logs for common statuses.
   */
  protected ignoreStatuses = [400, 401, 403, 404, 422]

  /**
   * Package errors that render themselves in their own JSON shape
   * (`@adonisjs/auth` invalid credentials, `@adonisjs/limiter` throttling).
   * The handler renders them through the envelope instead. Matched by code,
   * so the module does not import either package. Extend in the host to add
   * more.
   */
  protected envelopedErrorCodes: string[] = ['E_INVALID_CREDENTIALS', 'E_TOO_MANY_REQUESTS']

  async handle(error: unknown, ctx: HttpContext) {
    if (this.isEnvelopedError(error)) {
      return this.renderEnvelopedError(error, ctx)
    }
    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }

  /**
   * All non-validation errors that accept JSON land here
   * (auth, limiter, route not found, ApiException, unknown, …).
   * `ApiException` `data` travels next to the code.
   */
  async renderErrorAsJSON(error: HttpError, ctx: HttpContext): Promise<void> {
    const message = error.code ?? error.message
    const body = prepareError(message, error.status)
    if (error instanceof ApiException && error.data !== undefined) {
      body.data = error.data
    }
    ctx.response.status(error.status).json(body)
  }

  /**
   * Vine validation is the one structured special case (field messages[]).
   *
   * `message` is a code: the first field message when it is already a
   * specific code (`E_VALIDATION_ERROR_*`, for example from a custom rule),
   * else the generic `E_VALIDATION_ERROR`. Vine's sentences stay in `errors`.
   */
  async renderValidationErrorAsJSON(error: HttpError, ctx: HttpContext): Promise<void> {
    const messages = error.messages as Array<{ message?: string }> | undefined
    const first = messages?.[0]?.message ?? ''
    const message = first.startsWith(`${VALIDATION_ERROR}_`) ? first : VALIDATION_ERROR

    ctx.response.status(error.status).json({
      ...prepareError(message, error.status),
      errors: error.messages,
    })
  }

  protected isEnvelopedError(error: unknown): error is SelfHandledError {
    if (typeof error !== 'object' || error === null) return false
    const code = (error as SelfHandledError).code
    return typeof code === 'string' && this.envelopedErrorCodes.includes(code)
  }

  /**
   * Keeps the headers the package would send (for example `Retry-After`
   * and `X-RateLimit-*` from the limiter).
   */
  protected renderEnvelopedError(error: SelfHandledError, ctx: HttpContext) {
    const status = error.status ?? 400
    const headers = error.headers ?? error.getDefaultHeaders?.() ?? {}
    for (const [name, value] of Object.entries(headers)) {
      if (value === undefined || value === null) continue
      ctx.response.header(name, Array.isArray(value) ? value.map(String) : String(value))
    }
    return ctx.response.status(status).json(prepareError(error.code!, status))
  }
}
