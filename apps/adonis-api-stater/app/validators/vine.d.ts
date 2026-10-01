declare module '@vinejs/vine' {
  interface VineString {
    unique(options: { table: string; column: string }): this
    exists(options: { table: string; column: string }): this
    validToken(options: { table: string; column: string }): this
    validPassword(): this
  }
}

export {}
