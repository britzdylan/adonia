import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { ModelsTypes } from '#modules/types'
import encryption from '@adonisjs/core/services/encryption'
import env from '#start/env'

interface IUserModel extends ModelsTypes.IUserModel {};

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
}) 

export default class User extends compose(BaseModel, AuthFinder) implements ModelsTypes.ModularModel<IUserModel> {
  static accessTokens = DbAccessTokensProvider.forModel(User)

  nameSpace = 'user'

  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column()
  declare authMethod: 'github' | 'google' | 'email'

  @column()
  declare email: string

  @column()
  declare pendingEmail: string | null

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column({ serializeAs: null })
  declare avatarKey: string | null

  @column({ serializeAs: null })
  declare password: string | null

  @column({ serializeAs: null })
  declare emailVerificationToken: string | null

  @column()
  declare creemCustomerId: string | null

  @column()
  declare emailMarketing: boolean

  @column()
  declare emailProductUpdates: boolean

  @column()
  declare emailSecurityAlerts: boolean

  @column()
  declare emailWeeklyDigest: boolean

  @computed()
  get name() {
    return this.firstName + ' ' + this.lastName
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @computed()
  get avatar() {
    return this.avatarKey ? `${env.get('AVATAR_URL')}/${this.avatarKey}` : ''
  }

  verifyEmail() {
    this.emailVerifiedAt = DateTime.now()
    this.emailVerificationToken = null
  }

  generateVerificationToken() {
    this.emailVerificationToken = encryption.encrypt(this.email, '2 Hours')
  }
}
