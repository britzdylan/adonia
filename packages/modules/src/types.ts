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
  /** Lucid / SDK host I/O → `app/adapters/`. */
  withAdapters?: boolean
  /** models + migrations + controllers + validators + adapters (not routes). */
  withStubs?: boolean
  withRoutes?: boolean
  wireRoutes?: boolean
  withTests?: boolean
}
