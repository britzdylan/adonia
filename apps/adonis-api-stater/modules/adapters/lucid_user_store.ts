/**
 * Optional shared Lucid UserStore. Copy to app/adapters when scaffolding.
 * Expects a User model at #models/user with email, password, authMethod,
 * firstName, lastName, avatarKey, emailVerifiedAt, and emailVerificationToken.
 */
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import UserModel from '#models/user'
import { toUser } from './map_user.ts'
import type { RegisterUserInput, User, UserStore } from '#modules/contracts/index'

export class LucidUserStore implements UserStore {
  async createEmailUser(data: RegisterUserInput): Promise<User> {
    const user = await UserModel.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName ?? data.fullName?.split(' ')[0] ?? '',
      lastName: data.lastName ?? data.fullName?.split(' ').slice(1).join(' ') ?? '',
      authMethod: 'email',
    })
    return toUser(user)
  }

  async findOrFail(id: number): Promise<User> {
    const user = await UserModel.findOrFail(id)
    return toUser(user)
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findBy('email', email)
    return user ? toUser(user) : null
  }

  async findByEmailOrFail(email: string): Promise<User> {
    const user = await UserModel.findByOrFail('email', email)
    return toUser(user)
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const user = await UserModel.findBy('emailVerificationToken', token)
    return user ? toUser(user) : null
  }

  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = await UserModel.verifyCredentials(email, password)
    return toUser(user)
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await UserModel.findOrFail(userId)
    if (!user.password) {
      return false
    }
    return hash.verify(user.password, password)
  }

  async save(dto: User): Promise<User> {
    const user = await UserModel.findOrFail(dto.id)
    user.email = dto.email
    user.pendingEmail = dto.pendingEmail
    user.authMethod = dto.authMethod
    user.firstName = dto.firstName
    user.lastName = dto.lastName
    user.avatarKey = dto.avatarKey
    user.emailVerificationToken = dto.emailVerificationToken
    user.emailVerifiedAt = dto.emailVerifiedAt
      ? DateTime.fromJSDate(dto.emailVerifiedAt)
      : null
    await user.save()
    return toUser(user)
  }

  async updatePassword(dto: User, password: string): Promise<User> {
    const user = await UserModel.findOrFail(dto.id)
    user.password = password
    await user.save()
    return toUser(user)
  }

  async delete(userId: number): Promise<void> {
    const user = await UserModel.findOrFail(userId)
    await user.delete()
  }
}
