import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('auth_method').notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('avatar_key').nullable()
      table.string('password').nullable()
      table.string('email_verification_token').nullable()
      table.string('creem_customer_id').unique().nullable()
      table.boolean('email_marketing').defaultTo(false)
      table.boolean('email_product_updates').defaultTo(false)
      table.boolean('email_security_alerts').defaultTo(true)
      table.boolean('email_weekly_digest').defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.timestamp('email_verified_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
