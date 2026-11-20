# account

`account` is authenticated profile updates, staged email change,
password change, and account deletion.

| Field | Value |
|-------|-------|
| Depends on | `api`, `auth` |
| Env | `APP_KEY` |
| Peer models | `#models/user` |
| Events | `Account:UpdateUserProfile`, `Account:UpdateUserEmail`, `Account:ConfirmEmailChange`, `Account:UpdateUserPassword`, `Account:DeleteAccount`, `Account:Closed` |
| Contracts | `UserStore`, optional `AvatarStorage`, optional `AccountClosureStep[]` |

Marketing-preference HTTP in the example controller is host-owned.
The inbox routes call the notification module's `InboxService`. See
[concepts](../guide/concepts.md).

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
that package is missing.

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

### closeAccount

The user closes their own account. Takes `userId` and `password`:

1. Checks the password. A mismatch throws `E_INVALID_PASSWORD`.
2. Runs each closure step in order (for example, cancel billing).
3. Calls `deleteAccount`.
4. Emits `Account:Closed` with `{ userId, email, firstName, lastName }`.

If a step throws, nothing is deleted, so a user never keeps paying
for an account that is gone. A step's `ApiException` is thrown as it
is; any other error becomes `E_ACCOUNT_CLOSURE_FAILED` (502).

`Account:Closed` carries the address because the user row no longer
exists when listeners run. Send the confirmation email from it.

Closure steps are the fourth constructor argument (and of
`createAccountService`):

```ts
import { createAccountService } from '#adapters/account'
import { cancelSubscriptionsOnClose } from '#modules/subscription/closure_step'
import { defaultAccountOptions } from '#modules/account/options'
import subscriptionService from '#services/subscription_service'

const account = createAccountService(undefined, defaultAccountOptions, [
  cancelSubscriptionsOnClose(subscriptionService),
])
```

The controller stub's `DELETE /api/v1/account` route calls
`closeAccount` and needs `password` in the body.

### deleteAccount

Loads the user, deletes the avatar object when `avatarKey` is set,
deletes the user row, and emits `Account:DeleteAccount` with
`{ userId }`. No password check and no closure steps: use it for
admin and internal work, and `closeAccount` for a user's own request.

## Contracts you must implement

Skip `--with-adapters` only when you provide these ports yourself.
Account reuses auth's Lucid user store when you copy both sets of
adapters.

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

### AccountClosureStep

Optional. A step that must succeed before `closeAccount` deletes
anything.

```ts
type AccountClosureStep = {
  name: string
  run(user: User): Promise<void>
}
```

The subscription module ships one: `cancelSubscriptionsOnClose`.

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
| `Account:Closed` | `{ userId; email; firstName; lastName }` |

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
| A closure step failed | `E_ACCOUNT_CLOSURE_FAILED` |

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
| DELETE | `/api/v1/account` | `deleteAccount` | Yes (`closeAccount`) |
| GET / PUT | `/api/v1/account/notifications` | preference columns on `User` | No |
| GET / PATCH / POST | `/api/v1/account/inbox…` | `InboxService` (notification) | No |

Marketing preference columns (`emailMarketing` and related) live on
the example user model; the routes are host HTTP. The inbox routes
need the notification module with its adapters and model.

Limiter usage (`accountLimiter`, 60/min) is commented out until you
install `@adonisjs/limiter` from the auth start stub.

## Next steps

Hook mail and billing onto the account events:

1. Run migrations if the user table isn't applied yet.
2. Send confirmation mail from `Account:UpdateUserEmail` with
   [`notification`](./notification.md).
3. Add [`creem`](./creem.md) and [`subscription`](./subscription.md)
   when you need checkout and entitlement.
