import type { RegisterUserInput, User, UserStore } from '#modules/contracts/index'

type StoredUser = User & { password: string }

/**
 * In-memory UserStore for unit tests. Records saves for side-effect assertions.
 */
export class MemoryUserStore implements UserStore {
  users = new Map<number, StoredUser>()
  saves: User[] = []
  nextId = 1

  async createEmailUser(data: RegisterUserInput): Promise<User> {
    const user: StoredUser = {
      id: this.nextId++,
      email: data.email,
      pendingEmail: null,
      password: data.password,
      authMethod: 'email',
      firstName: data.firstName ?? data.fullName?.split(' ')[0] ?? '',
      lastName: data.lastName ?? data.fullName?.split(' ').slice(1).join(' ') ?? '',
      avatarKey: null,
      emailVerifiedAt: null,
      emailVerificationToken: null,
    }
    this.users.set(user.id, user)
    return this.toDto(user)
  }

  async findOrFail(id: number): Promise<User> {
    const user = this.users.get(id)
    if (!user) throw new Error(`User ${id} not found`)
    return this.toDto(user)
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = [...this.users.values()].find((row) => row.email === email)
    return user ? this.toDto(user) : null
  }

  async findByEmailOrFail(email: string): Promise<User> {
    const user = await this.findByEmail(email)
    if (!user) throw new Error(`User ${email} not found`)
    return user
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const user = [...this.users.values()].find((row) => row.emailVerificationToken === token)
    return user ? this.toDto(user) : null
  }

  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = [...this.users.values()].find(
      (row) => row.email === email && row.password === password
    )
    if (!user) throw new Error('Invalid credentials')
    return this.toDto(user)
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = this.users.get(userId)
    return !!user && user.password === password
  }

  async save(dto: User): Promise<User> {
    const existing = this.users.get(dto.id)
    if (!existing) throw new Error(`User ${dto.id} not found`)
    const next: StoredUser = { ...existing, ...dto, password: existing.password }
    this.users.set(dto.id, next)
    this.saves.push(this.toDto(next))
    return this.toDto(next)
  }

  async updatePassword(dto: User, password: string): Promise<User> {
    const existing = this.users.get(dto.id)
    if (!existing) throw new Error(`User ${dto.id} not found`)
    existing.password = password
    return this.toDto(existing)
  }

  async delete(userId: number): Promise<void> {
    this.users.delete(userId)
  }

  private toDto(user: StoredUser): User {
    const { password: _, ...dto } = user
    return { ...dto }
  }
}
