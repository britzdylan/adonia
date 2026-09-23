/**
 * Example auth controller. Copy into app/controllers and register routes.
 * Not registered by the starter.
 *
 * Copy Vine provider (`providers/vine_provider.ts`) and register it in
 * adonisrc.ts so unique/exists/validToken/validPassword macros load.
 * Logout needs named auth middleware from start/kernel.ts.
 */
import type { HttpContext } from '@adonisjs/core/http'
import {
  createAuthService,
  LucidAccessTokenSession,
  LucidUserStore,
} from '#modules/auth/adapters/index'
import { responseCodes } from '#constants/responseCodes'
import {
  loginValidator,
  registerValidator,
  activateValidator,
  requestPasswordResetValidator,
  updatePasswordValidator,
  validatePasswordResetValidator,
  resendActivationValidator,
} from '../validators/auth.ts'

const auth = createAuthService()

export default class AuthController {
  async register(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(registerValidator)
    const user = await auth.registerUser(data)
    return ctx.response.created(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_REGISTER.code,
        data: user,
      })
    )
  }

  async login(ctx: HttpContext) {
    const credentials = await ctx.request.validateUsing(loginValidator)
    const session = new LucidAccessTokenSession(ctx)
    const { user, session: sessionResult } = await auth.loginByEmail(credentials, session)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_LOGIN.code,
        data: { user, token: sessionResult.token ?? null },
      })
    )
  }

  async logout(ctx: HttpContext) {
    const session = new LucidAccessTokenSession(ctx)
    await auth.logout(session)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_LOGOUT.code,
        data: null,
      })
    )
  }

  async activate(ctx: HttpContext) {
    const { token } = await ctx.request.validateUsing(activateValidator)
    const user = await auth.activateUserAccount(token)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_ACTIVATE_ACCOUNT.code,
        data: user,
      })
    )
  }

  async sendAccountActivationEmail(ctx: HttpContext) {
    const { email } = await ctx.request.validateUsing(resendActivationValidator)
    const user = await new LucidUserStore().findByEmailOrFail(email)
    await auth.createNewVerificationToken(user)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_ACTIVATE_ACCOUNT_REQUEST.code,
        data: null,
      })
    )
  }

  async requestPasswordReset(ctx: HttpContext) {
    const { email } = await ctx.request.validateUsing(requestPasswordResetValidator)
    await auth.requestPasswordReset(email)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_RESET_PASSWORD_REQUEST.code,
        data: null,
      })
    )
  }

  async validatePasswordReset(ctx: HttpContext) {
    const { token } = await ctx.request.validateUsing(validatePasswordResetValidator)
    const reset = await auth.validatePasswordResetToken(token)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_VALIDATE_PASSWORD_RESET.code,
        data: reset,
      })
    )
  }

  async updatePassword(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(updatePasswordValidator)
    await auth.updatePassword(data)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.AUTH_UPDATE_PASSWORD.code,
        data: null,
      })
    )
  }
}
