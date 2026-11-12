import type { ApplicationService } from '@adonisjs/core/types'
import { HttpContext } from '@adonisjs/core/http'
import { BaseSerializer } from '@adonisjs/core/transformers'
import { type SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder'
import {
  isApiError,
  isApiResponse,
  isPaginatedResponse,
} from '#modules/api/envelope'
import type {
  ApiResponse,
  ApiResult,
  PaginatedResponse,
} from '#modules/types/api'

/**
 * Custom serializer for API responses that ensures consistent JSON structure
 * across all API endpoints. Wraps response data in a 'data' property and handles
 * pagination metadata for Lucid ORM query results.
 */
class ApiSerializer extends BaseSerializer<{
  Wrap: 'data'
  PaginationMetaData: SimplePaginatorMetaKeys
}> {
  /**
   * Wraps all serialized data under this key in the response object.
   * Example: { data: [...] } instead of returning raw arrays/objects
   */
  wrap: 'data' = 'data'

  /**
   * Validates and defines pagination metadata structure for paginated responses.
   * Ensures that pagination info from Lucid queries is properly formatted.
   *
   * @throws Error if metadata doesn't match Lucid's pagination structure
   */
  definePaginationMetaData(metaData: unknown): SimplePaginatorMetaKeys {
    if (!this.isLucidPaginatorMetaData(metaData)) {
      throw new Error(
        'Invalid pagination metadata. Expected metadata to contain Lucid pagination keys'
      )
    }
    return metaData
  }
}

/**
 * Single instance of ApiSerializer used across the application
 */
const serializer = new ApiSerializer()

const serialize = Object.assign(
  function (this: HttpContext, ...[data, resolver]: Parameters<ApiSerializer['serialize']>) {
    return serializer.serialize(data, resolver ?? this.containerResolver)
  },
  {
    withoutWrapping(
      this: HttpContext,
      ...[data, resolver]: Parameters<ApiSerializer['serializeWithoutWrapping']>
    ) {
      return serializer.serializeWithoutWrapping(data, resolver ?? this.containerResolver)
    },
  }
) as ApiSerializer['serialize'] & { withoutWrapping: ApiSerializer['serializeWithoutWrapping'] }

type Respondable =
  | ApiResponse<unknown>
  | ApiResult<unknown>
  | PaginatedResponse<unknown>

type SerializableRow = { serialize(): unknown }

/**
 * Lucid rows expose internals ($attributes, $original, …) as enumerable
 * properties. Duck-typed so this module does not import Lucid at runtime.
 */
function isLucidRow(value: unknown): value is SerializableRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$attributes' in value &&
    typeof (value as { serialize?: unknown }).serialize === 'function'
  )
}

/**
 * Serializes an envelope payload.
 * - null / undefined pass through (the serializer rejects null).
 * - Lucid rows go through row.serialize() so `serializeAs: null` columns
 *   (password, tokens) never reach the client.
 * - Everything else (transformers, DTOs, primitives) goes to the serializer.
 */
async function serializeData(ctx: HttpContext, data: unknown): Promise<unknown> {
  if (data === null || data === undefined) {
    return null
  }
  if (isLucidRow(data)) {
    return data.serialize()
  }
  if (Array.isArray(data) && data.some(isLucidRow)) {
    return Promise.all(data.map((item) => serializeData(ctx, item)))
  }
  return serializer.serializeWithoutWrapping(
    data as Parameters<ApiSerializer['serializeWithoutWrapping']>[0],
    ctx.containerResolver
  )
}

/**
 * Bridges ApiService envelopes to HTTP JSON without double-wrapping `data`.
 * Serializes the payload via transformers, then restores the shared envelope.
 */
export async function respond(this: HttpContext, result: Respondable) {
  if (isApiError(result)) {
    this.response.status(result.status ?? 400)
    return result
  }

  if (isPaginatedResponse(result)) {
    const data = await serializeData(this, result.data)
    return {
      success: true as const,
      message: result.message,
      data,
      meta: result.meta,
    }
  }

  if (isApiResponse(result)) {
    const data = await serializeData(this, result.data)
    return {
      success: true as const,
      message: result.message,
      data,
    }
  }

  return result
}

/**
 * Registers HTTP helpers used by all API controllers.
 */
export default class ApiProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    HttpContext.instanceProperty('serialize', serialize)
    HttpContext.instanceProperty('respond', respond)
  }
}

/**
 * Module augmentation for HttpContext API helpers.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    serialize: typeof serialize
    respond: typeof respond
  }
}
