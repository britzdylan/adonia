/**
 * Example account controller. Copy into app/controllers.
 * Requires an authenticated user on ctx.auth.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { createAccountService } from '#modules/account/adapters/index'
import { responseCodes } from '#constants/responseCodes'
import {
  updateProfileValidator,
  replaceEmailValidator,
  replacePasswordValidator,
  confirmEmailChangeValidator,
} from '../validators/account.ts'

const account = createAccountService()

export default class AccountController {
  async updateProfile(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const data = await ctx.request.validateUsing(updateProfileValidator)
    const updated = await account.updateProfile(user.id, data)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.PROFILE_UPDATED.code,
        data: updated,
      })
    )
  }

  async replaceEmail(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const data = await ctx.request.validateUsing(replaceEmailValidator)
    const updated = await account.replaceEmail(user.id, data)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.EMAIL_VERIFICATION_SENT.code,
        data: updated,
      })
    )
  }

  async confirmEmailChange(ctx: HttpContext) {
    const { token } = await ctx.request.validateUsing(confirmEmailChangeValidator)
    const user = await account.confirmEmailChange(token)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.EMAIL_CHANGE_CONFIRMED.code,
        data: user,
      })
    )
  }

  async replacePassword(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const data = await ctx.request.validateUsing(replacePasswordValidator)
    await account.replacePassword(user.id, data)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.PASSWORD_UPDATED.code,
        data: null,
      })
    )
  }
}
