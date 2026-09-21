import type { HttpContext } from '@adonisjs/core/http'

export default class AccessTokensController {
  async store({ response }: HttpContext) {
    return response.status(501).json({ message: 'Not implemented' })
  }

  async destroy({ response }: HttpContext) {
    return response.status(501).json({ message: 'Not implemented' })
  }
}
