import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import User from '#models/user'

export default class AppNotification extends BaseModel {
  static selfAssignPrimaryKey = true
  static table = 'notifications'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare type: string

  @column()
  declare title: string

  @column()
  declare body: string

  @column()
  declare data: Record<string, any> | null

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(model: AppNotification) {
    model.id = randomUUID()
  }

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
