/*
 * Domain base for feature modules.
 *
 * Envelope helpers (prepareResponse / prepareError / preparePaginatedResponse)
 * are for controllers and hosts — domain services under modules/ return DTOs
 * and throw ApiException instead of wrapping results.
 *
 * HTTP serialization lives on HttpContext via the api provider (ctx.respond).
 */
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import config from '@adonisjs/core/services/config'
import type { EventsList } from '@adonisjs/core/types'
import { ModelsTypes, ApiTypes } from '#modules/types'
import { prepareError } from '#modules/api/envelope'

export default class ApiService {
  namespace: ModelsTypes.NameSpace = null

  resolveConfig() {
    if (!this.namespace) {
      return null
    }
    return config.get<ModelsTypes.ModuleActionConfig>(`modules.${this.namespace}`)
  }

  /**
   * Build a success envelope. Prefer calling this from controllers/hosts,
   * not from domain services under modules/.
   */
  prepareResponse<T>(data: T, message: string | null = null): ApiTypes.ApiResponse<T> {
    return {
      data,
      message,
      success: true,
    }
  }

  prepareError(message: string, status?: number): ApiTypes.ApiResult<never> {
    return prepareError(message, status)
  }

  /**
   * Build a paginated success envelope with meta. Controllers/hosts only.
   */
  preparePaginatedResponse<T>(
    data: T[],
    total: number,
    params: ApiTypes.PaginationParams = {}
  ): ApiTypes.PaginatedResponse<T> {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? data.length
    return {
      data,
      message: null,
      success: true,
      meta: {
        total,
        page,
        pageSize,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
      },
    }
  }

  /**
   * Emit a typed domain event when listed in config/modules.ts.
   * Types come from EventsList augmentations imported by each feature module.
   */
  public async emitSafe<K extends keyof EventsList>(
    eventName: K,
    payload: EventsList[K]
  ): Promise<void> {
    const actionConfig = this.resolveConfig()
    if (!actionConfig) {
      logger.warn(`No modules.${this.namespace} config; skipping ${String(eventName)}`)
      return
    }
    if (!actionConfig.emits.includes(eventName as string)) {
      return
    }
    try {
      await emitter.emit(eventName, payload)
    } catch (err) {
      logger.error(`Event emit failed for ${String(eventName)}: %o`, err)
    }
  }
}
