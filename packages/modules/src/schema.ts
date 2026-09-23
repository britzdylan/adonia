import { z } from 'zod'

export const moduleManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  files: z.array(z.string()).default([]),
  stubs: z.array(z.string()).default([]),
  dependencies: z.record(z.string()).default({}),
  registryDependencies: z.array(z.string()).default([]),
  peerModels: z.array(z.string()).default([]),
  configKeys: z.array(z.string()).default([]),
  env: z.array(z.string()).default([]),
  events: z.array(z.string()).default([]),
  hostFacingExceptions: z.array(z.string()).default([]),
  hostTests: z.array(z.string()).default([]),
})

export type ModuleManifest = z.infer<typeof moduleManifestSchema>

export const hostModulesSchema = z.object({
  $schema: z.string().optional(),
  registry: z.string().min(1),
  ref: z.string().min(1),
  paths: z
    .object({
      modules: z.string(),
      models: z.string(),
      migrations: z.string(),
      controllers: z.string(),
      validators: z.string(),
    })
    .passthrough(),
  aliases: z
    .object({
      modules: z.string(),
      constants: z.string(),
      models: z.string(),
    })
    .passthrough(),
  installed: z.array(z.string()),
})

export type HostModulesConfig = z.infer<typeof hostModulesSchema>

export const registryIndexSchema = z.object({
  core: z.array(z.string()),
  modules: z.array(z.string()),
})

export type RegistryIndex = z.infer<typeof registryIndexSchema>

export const CORE_PACKAGES = ['types', 'constants', 'contracts'] as const

export function impliedCoreManifest(name: (typeof CORE_PACKAGES)[number]): ModuleManifest {
  return moduleManifestSchema.parse({
    name,
    description: `Shared ${name} package`,
    files: ['**/*'],
    stubs: [],
    dependencies: {},
    registryDependencies: [],
    peerModels: [],
    configKeys: [],
    env: [],
    events: [],
    hostFacingExceptions: [],
    hostTests: [],
  })
}
