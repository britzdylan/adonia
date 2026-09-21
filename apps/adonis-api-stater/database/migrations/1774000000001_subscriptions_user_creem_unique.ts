import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['creem_subscription_id'])
      table.unique(['user_id', 'creem_subscription_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['user_id', 'creem_subscription_id'])
      table.unique(['creem_subscription_id'])
    })
  }
}
