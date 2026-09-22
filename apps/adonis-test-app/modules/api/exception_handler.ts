import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { prepareError } from '#modules/api/envelope'

type HttpError = Parameters<ExceptionHandler['renderErrorAsJSON']>[0]

/**
 * Global API exception handler.
 *
 * Overrides JSON renderers so Adonis package errors, validation errors, and
 * AppException all share one envelope — no per-package instanceof branches.
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

  async handle(error: unknown, ctx: HttpContext) {
    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }

  /**
   * All non-validation errors that accept JSON land here
   * (auth, limiter, route not found, AppException, unknown, …).
   */
  async renderErrorAsJSON(error: HttpError, ctx: HttpContext): Promise<void> {
    const message = error.code ?? error.message
    ctx.response.status(error.status).json(prepareError(message, error.status))
  }

  /**
   * Vine validation is the one structured special case (field messages[]).
   */
  async renderValidationErrorAsJSON(error: HttpError, ctx: HttpContext): Promise<void> {
    const messages = error.messages as Array<{ message?: string }> | undefined
    const firstMessage = messages?.[0]?.message
    const message = firstMessage ?? error.code ?? error.message

    ctx.response.status(error.status).json({
      ...prepareError(message, error.status),
      errors: error.messages,
    })
  }
}
