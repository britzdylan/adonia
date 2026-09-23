/**
 * Host Creem factory. Copied to app/adapters/creem.ts.
 * Import as `#adapters/creem`.
 */
import { CreemService } from '#modules/creem/service'
import { CreemIoClient } from './creem_io_client.ts'
import type {
  CreemClientOptions,
  CreemConfig,
} from '#modules/creem/contracts/index'

export { CreemIoClient } from './creem_io_client.ts'

export type CreateCreemServiceOptions = CreemClientOptions & CreemConfig

export function createCreemService(options: CreateCreemServiceOptions) {
  const { successUrl, productPlans, defaultPlan, ...clientOptions } = options
  return new CreemService(new CreemIoClient(clientOptions), {
    successUrl,
    productPlans,
    defaultPlan,
  })
}
