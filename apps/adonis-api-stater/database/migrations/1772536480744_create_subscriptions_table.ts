import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary().notNullable()
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.string('creem_customer_id').notNullable()
      table.string('creem_subscription_id').unique()
      table.string('creem_product_id').notNullable()
      table.string('plan').notNullable()
      table.string('status').notNullable()
      table.timestamp('current_period_start')
      table.timestamp('current_period_end')
      table.timestamp('canceled_at')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
