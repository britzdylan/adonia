# auth

`auth` is email registration, login, verification, and password reset.
The service talks only to `UserStore`, `PasswordResetStore`, and a
per-request `SessionManager`. HTTP, Lucid, and Vine stay in host
adapters and optional stubs.

This page covers the service API, the contracts you must implement,
events, tokens, and the stub kit (`--with-adapters`, `--with-stubs`,
`--with-routes`).

## Add it

`auth` depends on [`api`](./api.md) (and the rest of core). `add`
installs those first when they aren't already in `adonia.json`.

```bash
npx adonia add auth
npx adonia add auth --with-adapters
npx adonia add auth --with-stubs
npx adonia add auth --with-routes --wire-routes
```

The host must provide `APP_KEY` (Adonis encryption). `add` prints a
hint when the key is missing from `.env`, `.env.example`, and
`start/env.ts`; it does not write the value.

`--with-stubs` or `--with-routes` copies `start/limiter.ts`. If
`@adonisjs/limiter` isn't in `package.json`, `add` prints
`node ace add @adonisjs/limiter`.

## What you get

Plain `add` copies the domain slice to `modules/auth/`:

| Path | Role |
|------|------|
| `service.ts` | `AuthService` |
| `events.ts` | `EventsList` augmentation |
| `options.ts` | Token TTLs and reset token byte length |
| `contracts/` | Auth-only ports and DTOs |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-models` / `--with-stubs` | `app/models/user.ts`, `password_reset.ts` |
| `--with-migrations` / `--with-stubs` | `database/migrations/` users, pending email, password resets |
| `--with-controllers` / `--with-stubs` | `app/controllers/auth_controller.ts` (implies adapters) |
| `--with-validators` / `--with-stubs` | `app/validators/auth.ts`, Vine rules, `providers/vine_provider.ts` |
| `--with-adapters` / `--with-stubs` / `--with-controllers` | `app/adapters/` Lucid stores, access-token session, `createAuthService` |
| `--with-routes` | `start/routes/auth.ts` plus `start/limiter.ts` |
| `--with-tests` | `modules/auth/tests/` |

Peer models the Lucid adapters expect: `#models/user`,
`#models/password_reset`.

Register `providers/vine_provider.ts` in `adonisrc.ts` when you copy
validators. The example logout route needs named auth middleware from
`start/kernel.ts`.

## AuthService

Construct with a `UserStore`, a `PasswordResetStore`, and optional
`AuthOptions`. The adapter stub is `createAuthService()` from
`#adapters/auth`.

```ts
import { createAuthService } from '#adapters/auth'

const auth = createAuthService()
```

Override options at construction. Don't read env inside the service.

| Option | Default | Purpose |
|--------|---------|---------|
| `verificationTtl` | `'2 Hours'` | Passed to `encryption.encrypt` for email verification |
| `passwordResetTtl` | `{ hours: 2 }` | Lifetime of a newly requested reset token |
| `passwordResetValidateTtl` | `{ minutes: 5 }` | Lifetime after `validatePasswordResetToken` rotates the token |
| `passwordResetTokenBytes` | `40` | Byte length for `string.generateRandom` in the Lucid reset store |

### registerUser

Creates an email user, issues an encrypted verification token, saves,
emits `Auth:RegisterUser`, and returns the `User`. The store must not
set `emailVerifiedAt` or the token itself.

### createNewVerificationToken

Re-issues a verification token for an existing user and emits
`Auth:CreateNewVerificationToken`. Hosts that resend activation email
call this behind their own rate limit.

### loginByEmail

Verifies credentials through `UserStore.verifyCredentials`, opens a
session, emits `Auth:Login`, and returns `{ user, session }`.

If `emailVerifiedAt` is `null`, the method throws `E_ACCOUNT_UNVERIFIED`
with **no side effects**. It does not rotate the verification token.
To resend, call `createNewVerificationToken` from a dedicated route.

### activateUserAccount

Looks up the user by verification token, compares decrypted values,
sets `emailVerifiedAt`, clears the token, emits
`Auth:ActivateUserAccount`, and returns the user. Invalid or missing
tokens throw `E_INVALID_TOKEN`.

### requestPasswordReset

Loads the user by email (`findByEmailOrFail`), creates a reset row,
and emits `Auth:RequestPasswordReset` with `{ user, token }`. Listen
for that event to send mail. The method returns `void` on success.

### validatePasswordResetToken

Loads the reset by token. Expired or missing tokens throw
`E_INVALID_TOKEN`. On success it rotates the token with
`passwordResetValidateTtl` and returns the new `AuthPasswordReset`.
Use this when the user opens the reset link, before they submit a
new password.

### updatePassword

Validates the reset token, optionally logs the session out, updates
the password, deletes reset rows for that user, and emits
`Auth:ResetPassword`. Pass a `SessionManager` when you want the
current session cleared as part of the reset.

### logout

Calls `session.logout()` and emits `Auth:Logout` with `null`.

## Contracts you must implement

Skip `--with-adapters` only when you provide these ports yourself.

### UserStore

Shared with `account`. See [`api`](./api.md#shared-userstore). Auth
uses `createEmailUser`, `save`, `verifyCredentials`,
`findByVerificationToken`, `findByEmailOrFail`, `updatePassword`.

### PasswordResetStore

Host persistence for password-reset rows. The Lucid stub invalidates
existing tokens before creating a new one.

| Method | Behavior |
|--------|----------|
| `createForUser(userId, duration)` | Invalidate existing reset rows, then create a token |
| `findByToken(token)` | Lookup or `null` |
| `deleteForUser(userId)` | Remove reset rows |
| `refreshToken(reset, duration)` | Rotate token and expiry |
| `findUserByReset(reset)` | Resolve the owning `User` |

### SessionManager

Controllers pass a per-request implementation. Access-token hosts
return `{ token, expiresAt }`; cookie hosts may return `{}`.

```ts
interface SessionManager {
  login(user: User): Promise<SessionResult>
  logout(): Promise<void>
}
```

The Lucid stub `LucidAccessTokenSession` wraps Adonis access tokens
on `HttpContext`.

## Events

Import `#modules/auth/events` so the `EventsList` types load. Events
fire only when listed under `modules.auth.emits` in
`config/modules.ts`.

| Event | Payload |
|-------|---------|
| `Auth:RegisterUser` | `User` |
| `Auth:CreateNewVerificationToken` | `User` |
| `Auth:ActivateUserAccount` | `User` |
| `Auth:RequestPasswordReset` | `{ user: User; token: string }` |
| `Auth:ResetPassword` | `{ user: User }` |
| `Auth:Login` | `{ user: User }` |
| `Auth:Logout` | `null` |

## Exceptions

`AuthService` throws:

| Situation | Code |
|-----------|------|
| Unverified login | `E_ACCOUNT_UNVERIFIED` |
| Bad or expired verification / reset token | `E_INVALID_TOKEN` |

Credential failures come from `UserStore.verifyCredentials` (the
Lucid Auth finder). The exception handler maps those to the shared
JSON envelope.

These codes are listed as host-facing in `module.json` for
middleware and limiters; the service doesn't throw them today:

- `E_INVALID_CREDENTIALS`, `E_UNAUTHENTICATED`, `E_SESSION_EXPIRED`
- `E_FORBIDDEN`
- `E_TOO_MANY_ATTEMPTS`, `E_TOO_MANY_REQUESTS`

## Example routes

`--with-routes` copies a group prefixed `/api/v1/auth`, named
`adonia.auth`:

| Method | Path | Controller |
|--------|------|------------|
| POST | `/api/v1/auth/register` | `register` |
| POST | `/api/v1/auth/login` | `login` |
| POST | `/api/v1/auth/logout` | `logout` |
| POST | `/api/v1/auth/activate` | `activate` |
| POST | `/api/v1/auth/activate/request` | `sendAccountActivationEmail` |
| POST | `/api/v1/auth/password/forgot` | `requestPasswordReset` |
| POST | `/api/v1/auth/password/validate` | `validatePasswordReset` |
| POST | `/api/v1/auth/password/reset` | `updatePassword` |

Limiter calls on sensitive routes are commented out until you install
`@adonisjs/limiter` and uncomment `.use(authLimiter)`.

## Next steps

Add authenticated profile flows, or stop at domain-only auth:

1. Run migrations if you copied models: `node ace migration:run`.
2. Listen for `Auth:RegisterUser` and `Auth:RequestPasswordReset` to
   send mail (often through [`notification`](./notification.md)).
3. Add [`account`](./account.md) for profile, email change, password
   change, and deletion.
