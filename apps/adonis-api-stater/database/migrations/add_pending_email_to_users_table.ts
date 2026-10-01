import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('pending_email', 254).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pending_email')
    })
  }
}
