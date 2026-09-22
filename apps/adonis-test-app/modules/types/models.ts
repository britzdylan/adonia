import { DateTime } from 'luxon'

export type ModuleActionConfig = {
  description: string
  /** Event names enabled for emitSafe. Filled from each module's events list. */
  emits: string[]
}

export type NameSpace = null | string

export type ModularModel<T> = {
  nameSpace: NameSpace
} & T

export interface IUserModel {
  id: number
  authMethod: 'github' | 'google' | 'email'
  email: string
  pendingEmail: string | null
  firstName: string
  lastName: string
  avatarKey: string | null
  password: string | null
  emailVerificationToken: string | null
  createdAt: DateTime
  updatedAt: DateTime | null
  emailVerifiedAt: DateTime | null
  verifyEmail(): void
  generateVerificationToken(): void
  get name(): string
  get avatar(): string
}
