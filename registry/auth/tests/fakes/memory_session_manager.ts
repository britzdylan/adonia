import type { User } from '#modules/contracts/index'
import type {
  SessionManager,
  SessionResult,
} from '#modules/auth/contracts/index'

/**
 * In-memory SessionManager. Cookie-style hosts return {}.
 */
export class MemorySessionManager implements SessionManager {
  logins: User[] = []
  logouts = 0
  result: SessionResult = {}

  async login(user: User): Promise<SessionResult> {
    this.logins.push(user)
    return this.result
  }

  async logout(): Promise<void> {
    this.logouts++
  }
}
