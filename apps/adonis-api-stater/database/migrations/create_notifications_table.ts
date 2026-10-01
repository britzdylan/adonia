import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().unique().notNullable()
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      table.string('type').notNullable()
      table.string('title').notNullable()
      table.text('body').notNullable()
      table.json('data').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
