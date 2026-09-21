import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class PasswordReset extends BaseModel {
  static table = 'password_resets'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare token: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
