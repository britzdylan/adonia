import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ response }: HttpContext) {
    return response.status(501).json({ message: 'Not implemented' })
  }
}
