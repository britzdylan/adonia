import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async store({ response }: HttpContext) {
    return response.status(501).json({ message: 'Not implemented' })
  }
}
