/**
 * AuthService
 *
 * Domain auth use-cases. Depends on shared UserStore + auth-only contracts.
 * Returns DTOs / void; controllers build HTTP envelopes and call ctx.respond.
 */
import encryption from '@adonisjs/core/services/encryption'
import ApiService from '#modules/api/service'
import ApiException from '#modules/api/exception'
import { exceptions } from '#constants/exceptions'
import type { RegisterUserInput, User, UserStore } from '#modules/contracts/index'
import type {
  AuthPasswordReset,
  LoginCredentials,
  LoginResult,
  PasswordResetStore,
  SessionManager,
  UpdatePasswordInput,
} from '#modules/auth/contracts/index'
import { defaultAuthOptions, type AuthOptions } from '#modules/auth/options'
import '#modules/auth/events'

export class AuthService extends ApiService {
  namespace = 'auth'

  constructor(
    private users: UserStore,
    private passwordResets: PasswordResetStore,
    private options: AuthOptions = defaultAuthOptions
  ) {
    super()
  }

  private accountUnverifiedException() {
    return ApiException.from(exceptions.ACCOUNT_UNVERIFIED)
  }

  private invalidTokenException() {
    return ApiException.from(exceptions.INVALID_TOKEN)
  }

  private tokensMatch(incoming: string, stored: string): boolean {
    const storedToken = encryption.decrypt(stored)
    return encryption.decrypt(incoming) === storedToken && storedToken != null
  }

  private issueVerificationToken(user: User, email = user.email): User {
    return {
      ...user,
      emailVerificationToken: encryption.encrypt(email, this.options.verificationTtl),
    }
  }

  private markVerified(user: User): User {
    return {
      ...user,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    }
  }

  public async registerUser(data: RegisterUserInput): Promise<User> {
    let user = await this.users.createEmailUser(data)
    user = await this.users.save(this.issueVerificationToken(user))
    this.emitSafe('Auth:RegisterUser', user)
    return user
  }

  public async createNewVerificationToken(user: User): Promise<User> {
    const updated = await this.users.save(this.issueVerificationToken(user))
    this.emitSafe('Auth:CreateNewVerificationToken', updated)
    return updated
  }

  /**
   * Authenticates and opens a session. Throws E_ACCOUNT_UNVERIFIED with no
   * side effects when the account is unverified — hosts that want a resend
   * call createNewVerificationToken behind their own rate limit.
   */
  public async loginByEmail(
    data: LoginCredentials,
    session: SessionManager
  ): Promise<LoginResult> {
    const user = await this.users.verifyCredentials(data.email, data.password)
    if (user.emailVerifiedAt === null) {
      throw this.accountUnverifiedException()
    }
    const sessionResult = await session.login(user)
    this.emitSafe('Auth:Login', { user })
    return { user, session: sessionResult }
  }

  public async activateUserAccount(token: string): Promise<User> {
    const user = await this.users.findByVerificationToken(token)
    if (!user) {
      throw this.invalidTokenException()
    }
    if (!user.emailVerificationToken || !this.tokensMatch(token, user.emailVerificationToken)) {
      throw this.invalidTokenException()
    }
    const verified = await this.users.save(this.markVerified(user))
    this.emitSafe('Auth:ActivateUserAccount', verified)
    return verified
  }

  public async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmailOrFail(email)
    const reset = await this.passwordResets.createForUser(
      user.id,
      this.options.passwordResetTtl
    )
    this.emitSafe('Auth:RequestPasswordReset', {
      user,
      token: reset.token,
    })
  }

  public async validatePasswordResetToken(token: string): Promise<AuthPasswordReset> {
    const passwordReset = await this.passwordResets.findByToken(token)
    if (!passwordReset || passwordReset.isExpired) {
      throw this.invalidTokenException()
    }
    return this.passwordResets.refreshToken(
      passwordReset,
      this.options.passwordResetValidateTtl
    )
  }

  public async updatePassword(
    data: UpdatePasswordInput,
    session?: SessionManager
  ): Promise<void> {
    const passwordReset = await this.passwordResets.findByToken(data.token)
    if (!passwordReset || passwordReset.isExpired) {
      throw this.invalidTokenException()
    }
    const user = await this.passwordResets.findUserByReset(passwordReset)
    if (session) {
      await session.logout()
    }
    await this.users.updatePassword(user, data.password)
    await this.passwordResets.deleteForUser(user.id)
    this.emitSafe('Auth:ResetPassword', { user })
  }

  public async logout(session: SessionManager): Promise<void> {
    await session.logout()
    this.emitSafe('Auth:Logout', null)
  }
}
