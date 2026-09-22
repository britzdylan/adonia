/**
 * Optional SessionManager using Adonis access tokens.
 * Copy to app/adapters/auth when scaffolding.
 *
 * Controllers construct this per request and pass it into AuthService.
 */
import type { HttpContext } from '@adonisjs/core/http'
import UserModel from '#models/user'
import type { User } from '#modules/contracts/index'
import type {
  SessionManager,
  SessionResult,
} from '#modules/auth/contracts/index'

export class LucidAccessTokenSession implements SessionManager {
  constructor(private ctx: HttpContext) {}

  async login(user: User): Promise<SessionResult> {
    const model = await UserModel.findOrFail(user.id)
    const token = await UserModel.accessTokens.create(model)
    return {
      token: token.value!.release(),
      expiresAt: token.expiresAt ?? undefined,
    }
  }

  async logout(): Promise<void> {
    const user = this.ctx.auth.getUserOrFail()
    if ('currentAccessToken' in user && user.currentAccessToken) {
      await UserModel.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
  }
}
