# account

`account` is authenticated profile updates, staged email change,
password change, and account deletion. It reuses the shared
`UserStore` from [`auth`](./auth.md) and an optional `AvatarStorage`
port for file cleanup.

This page covers the service API, email-change tokens, avatar
cleanup, events, and the stub kit. Inbox and marketing-preference
HTTP endpoints in the example controller are host-owned; they are
not methods on `AccountService`.

## Add it

`account` depends on `api` and `auth`. `add` installs those first
when they're missing.

```bash
npx adonia add account
npx adonia add account --with-adapters
npx adonia add account --with-stubs
npx adonia add account --with-routes --wire-routes
```

The host must provide `APP_KEY` (encryption for pending-email
tokens). `--with-adapters` copies `DriveAvatarStorage`, which needs
`@adonisjs/drive`. `add` prints `node ace add @adonisjs/drive` when
that kit is missing.

The Lucid factory imports `#adapters/lucid_user_store`. Copy auth
adapters before or together with account adapters.

## What you get

Plain `add` copies the domain slice to `modules/account/`:

| Path | Role |
|------|------|
| `service.ts` | `AccountService` |
| `events.ts` | `EventsList` augmentation |
| `options.ts` | Pending-email token TTL |
| `contracts/` | Profile/email/password inputs and `AvatarStorage` |
| `module.json` | Manifest |

Optional stubs:

| Flag | Destination |
|------|-------------|
| `--with-controllers` / `--with-stubs` | `app/controllers/account_controller.ts` (implies adapters) |
| `--with-validators` / `--with-stubs` | `app/validators/account.ts` and Vine provider |
| `--with-adapters` / `--with-stubs` / `--with-controllers` | `app/adapters/account.ts`, `drive_avatar_storage.ts` |
| `--with-routes` | `start/routes/account.ts` |
| `--with-tests` | `modules/account/tests/` |

There are no account-owned models or migrations. The user row comes
from auth stubs. Inbox routes in the example controller need
[`notification`](./notification.md) models
(`adonia add notification --with-models`).

Peer model: `#models/user`.

## AccountService

Construct with a `UserStore`, optional `AvatarStorage`, and optional
`AccountOptions`. The adapter stub is `createAccountService()` from
`#adapters/account`.

```ts
import { createAccountService } from '#adapters/account'

const account = createAccountService()
```

When you omit `AvatarStorage`, the service uses a no-op that never
deletes files. `emailChangeTtl` defaults to `'2 Hours'`.

### updateProfile

Loads the user, applies any of `firstName`, `lastName`, and
`avatarKey`, and saves. `avatarKey` may be a new storage key, `null`
to clear, or omitted to leave the current value.

If `avatarKey` changes and a previous key existed, the service
deletes the old object through `AvatarStorage.delete`. Then it emits
`Account:UpdateUserProfile` and returns the saved `User`.

The service never accepts an upload. The host uploads the file,
stores it, and passes the resulting key.

### replaceEmail

Stages a new address on `pendingEmail`. The current `email` stays
valid until confirmation.

It throws `E_SAME_EMAIL` when the new address matches the current
one, and `E_EMAIL_EXISTS` when another user already owns it. On
success it encrypts a verification token for the pending address,
emits `Account:UpdateUserEmail` with `{ user, newEmail }`, and
returns the updated user.

### confirmEmailChange

Finds the user by verification token, requires `pendingEmail`,
compares decrypted tokens, and checks the pending address isn't
taken by someone else. Then it writes `email` from `pendingEmail`,
clears the pending fields, sets `emailVerifiedAt`, emits
`Account:ConfirmEmailChange`, and returns the user.

Invalid tokens throw `E_INVALID_TOKEN`. A race where another user
claimed the address throws `E_EMAIL_EXISTS`.

### replacePassword

Verifies `currentPassword` through `UserStore.verifyPassword`. A
mismatch throws `E_INVALID_PASSWORD`. On success it hashes and
stores `newPassword` and emits `Account:UpdateUserPassword`.

### deleteAccount

Loads the user, deletes the avatar object when `avatarKey` is set,
deletes the user row, and emits `Account:DeleteAccount` with
`{ userId }`.

## Contracts you must implement

Skip `--with-adapters` only when you provide these ports yourself.
Account reuses auth's Lucid user store when you copy both adapter
kits.

### UserStore

Same shared port as auth. Account uses `findOrFail`, `save`,
`findByEmail`, `findByVerificationToken`, `verifyPassword`,
`updatePassword`, and `delete`.

### AvatarStorage

Optional file cleanup. The service never imports Adonis Drive or
`MultipartFile`.

```ts
interface AvatarStorage {
  delete(key: string): Promise<void>
}
```

The Drive stub deletes by key. Swap it for S3, local disk, or a
no-op in tests.

## Events

Import `#modules/account/events`. Events fire only when listed under
`modules.account.emits`.

| Event | Payload |
|-------|---------|
| `Account:UpdateUserProfile` | `User` |
| `Account:UpdateUserEmail` | `{ user: User; newEmail: string }` |
| `Account:ConfirmEmailChange` | `User` |
| `Account:UpdateUserPassword` | `User` |
| `Account:DeleteAccount` | `{ userId: number }` |

Listen for `Account:UpdateUserEmail` to send the confirmation
message to `newEmail`, not the current address.

## Exceptions

`AccountService` throws these codes. The handler puts the `E_*` token
in the envelope `message` field.

| Situation | Code |
|-----------|------|
| New email equals current | `E_SAME_EMAIL` |
| Email already taken | `E_EMAIL_EXISTS` |
| Bad or expired pending-email token | `E_INVALID_TOKEN` |
| Current password mismatch | `E_INVALID_PASSWORD` |

`module.json` also lists `PAYLOAD_TOO_LARGE` (`E_PAYLOAD_TOO_LARGE`,
413) for host upload limits. The service doesn't throw it.

## Example routes

`--with-routes` copies two groups. Auth middleware on each route is
commented out until you enable named middleware from
`start/kernel.ts`. `POST /api/v1/account/email/confirm` is public
(token in the body).

| Method | Path | Controller | On AccountService? |
|--------|------|------------|--------------------|
| GET | `/api/v1/user` | `getAuthenticatedUser` | No (reads `ctx.auth`) |
| PATCH | `/api/v1/account/profile` | `updateProfile` | Yes |
| POST | `/api/v1/account/email` | `replaceEmail` | Yes |
| POST | `/api/v1/account/email/confirm` | `confirmEmailChange` | Yes |
| POST | `/api/v1/account/password` | `replacePassword` | Yes |
| DELETE | `/api/v1/account` | `deleteAccount` | Yes |
| GET / PUT | `/api/v1/account/notifications` | preference columns on `User` | No |
| GET / PATCH / POST | `/api/v1/account/inbox…` | Lucid `AppNotification` | No |

Marketing preference columns (`emailMarketing` and related) and
inbox CRUD live on the example user model and notification model.
They are host HTTP, not domain methods.

Limiter usage (`accountLimiter`, 60/min) is commented out until you
install `@adonisjs/limiter` from the auth start stub.

## Next steps

Hook mail and billing onto the account events:

1. Run migrations if the user table isn't applied yet.
2. Send confirmation mail from `Account:UpdateUserEmail` with
   [`notification`](./notification.md).
3. Add [`creem`](./creem.md) and [`subscription`](./subscription.md)
   when you need checkout and entitlement.
