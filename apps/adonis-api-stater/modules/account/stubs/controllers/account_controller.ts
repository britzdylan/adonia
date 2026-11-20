/**
 * Example account controller. Copy into app/controllers.
 *
 * Copy Vine provider (`providers/vine_provider.ts`) and register it in
 * adonisrc.ts so unique/validPassword macros load (same provider as auth).
 * Authenticated routes need named auth middleware from start/kernel.ts.
 * Inbox methods need the notification module with its adapters and model
 * (`adonia add notification --with-adapters --with-models`).
 */
import type { HttpContext } from '@adonisjs/core/http'
import { createAccountService } from '#adapters/account'
import { toUser } from '#adapters/map_user'
import { toPublicUser } from '#modules/contracts/index'
import { responseCodes } from '#constants/responseCodes'
import User from '#models/user'
import { createInboxService } from '#adapters/notification'
import {
  updateProfileValidator,
  replaceEmailValidator,
  replacePasswordValidator,
  closeAccountValidator,
  confirmEmailChangeValidator,
  updateNotificationsValidator,
} from '../validators/account.ts'

const account = createAccountService()
const inbox = createInboxService()

export default class AccountController {
  async getAuthenticatedUser(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.USER_SHOW.code,
        data: toPublicUser(toUser(user)),
      })
    )
  }

  async updateProfile(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const data = await ctx.request.validateUsing(updateProfileValidator)
    const updated = await account.updateProfile(user.id, data)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.PROFILE_UPDATED.code,
        data: toPublicUser(updated),
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
        data: toPublicUser(updated),
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
        data: toPublicUser(user),
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

  async deleteAccount(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const { password } = await ctx.request.validateUsing(closeAccountValidator)
    await account.closeAccount(user.id, password)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.ACCOUNT_DELETED.code,
        data: null,
      })
    )
  }

  async getNotifications(ctx: HttpContext) {
    const authUser = ctx.auth.getUserOrFail()
    const user = await User.findOrFail(authUser.id)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.NOTIFICATIONS_FETCHED.code,
        data: {
          emailMarketing: user.emailMarketing,
          emailProductUpdates: user.emailProductUpdates,
          emailSecurityAlerts: user.emailSecurityAlerts,
          emailWeeklyDigest: user.emailWeeklyDigest,
        },
      })
    )
  }

  async updateNotifications(ctx: HttpContext) {
    const authUser = ctx.auth.getUserOrFail()
    const data = await ctx.request.validateUsing(updateNotificationsValidator)
    const user = await User.findOrFail(authUser.id)
    if (data.emailMarketing !== undefined) user.emailMarketing = data.emailMarketing
    if (data.emailProductUpdates !== undefined) {
      user.emailProductUpdates = data.emailProductUpdates
    }
    if (data.emailSecurityAlerts !== undefined) {
      user.emailSecurityAlerts = data.emailSecurityAlerts
    }
    if (data.emailWeeklyDigest !== undefined) user.emailWeeklyDigest = data.emailWeeklyDigest
    await user.save()
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.NOTIFICATIONS_UPDATED.code,
        data: {
          emailMarketing: user.emailMarketing,
          emailProductUpdates: user.emailProductUpdates,
          emailSecurityAlerts: user.emailSecurityAlerts,
          emailWeeklyDigest: user.emailWeeklyDigest,
        },
      })
    )
  }

  async getInboxNotifications(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.INBOX_FETCHED.code,
        data: await inbox.getInbox(user.id),
      })
    )
  }

  async markAllNotificationsRead(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    await inbox.markAllRead(user.id)
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.INBOX_MARKED_ALL_READ.code,
        data: null,
      })
    )
  }

  async markNotificationRead(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()
    const notification = await inbox.markRead(user.id, String(ctx.params.id))
    return ctx.response.ok(
      await ctx.respond({
        success: true,
        message: responseCodes.INBOX_MARKED_READ.code,
        data: notification,
      })
    )
  }
}
