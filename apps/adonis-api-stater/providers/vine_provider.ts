/**
 * Registers Vine macros used by auth validators: unique, exists,
 * validToken, validPassword.
 *
 * Copy into providers/ and register in adonisrc.ts providers, after
 * `@adonisjs/core/providers/vinejs_provider`:
 *
 *   () => import('#providers/vine_provider'),
 */
import type { ApplicationService } from '@adonisjs/core/types'
import { VineString } from '@vinejs/vine'
import { uniqueRule } from '#validators/rules/unique'
import { existsRule } from '#validators/rules/exists'
import { validTokenRule } from '#validators/rules/valid_token'
import { validPasswordRule } from '#validators/rules/valid_password'

export default class VineMacrosProvider {
  constructor(protected app: ApplicationService) {}

  boot() {
    VineString.macro(
      'unique',
      function (this: VineString, options: { table: string; column: string }) {
        return this.use(uniqueRule(options))
      }
    )
    VineString.macro(
      'exists',
      function (this: VineString, options: { table: string; column: string }) {
        return this.use(existsRule(options))
      }
    )
    VineString.macro(
      'validToken',
      function (this: VineString, options: { table: string; column: string }) {
        return this.use(validTokenRule(options))
      }
    )
    VineString.macro('validPassword', function (this: VineString) {
      return this.use(validPasswordRule())
    })
  }
}
