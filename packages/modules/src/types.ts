export interface SharedFlags {
  cwd: string
  yes: boolean
  dryRun: boolean
  registry?: string
  overwrite: boolean
}

/** Opt-in host scaffolding for `add` / `diff` / scaffold. */
export interface ScaffoldFlags {
  withModels?: boolean
  withMigrations?: boolean
  withControllers?: boolean
  withValidators?: boolean
  /** models + migrations + controllers + validators (not routes). */
  withStubs?: boolean
  withRoutes?: boolean
  wireRoutes?: boolean
  withTests?: boolean
}
