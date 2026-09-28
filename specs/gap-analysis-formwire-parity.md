# Adonia Parity Gap Analysis vs FormWire

Mode: audit
Project: Adonia

Cross-reference of FormWire (`apps/api`) against the Adonia module registry
to identify what is incomplete, missing, or needs refinement.

## CLI hardening — DONE

All items from `specs/cli-hardening.md` are implemented and tested:

| Item | Status | Evidence |
|------|--------|----------|
| A1 kernel `server` import | Done | `wire.ts:100-104`, `cli.test.ts:121` |
| A2 no install on conflicts | Done | `add.ts:213`, `cli.test.ts:206` |
| A3 reject `github:` registries | Done | `registry/index.ts:71`, `cli.test.ts:308` |
| A4 stronger `check` | Done | `check.ts:65-119`, `cli.test.ts:275` |
| B1 invert stub default | Done | No stubs by default, `cli.test.ts:143` |
| B2 `--with-*` flags | Done | All flags in `cli.ts:49-58` |
| B3 route stubs + `--wire-routes` | Done | `wire.ts:149`, `cli.test.ts:173` |
| B4 `init --scaffold` | Done | `init.ts:104-142`, `cli.test.ts:290` |
| B5 `check` under new defaults | Done | `cli.test.ts:264` |

The spec status ("To Do") was never updated after implementation.

---

## Part 1 — Module stub completeness

### Auth module (`registry/auth/`)

#### Missing routes vs FormWire (`start/routes/auth.ts`)

| Route | Adonia stub | FormWire | Notes |
|-------|-------------|----------|-------|
| `POST /logout` | Missing | Present, `middleware.auth()` | Entirely absent |
| `POST /password/validate` | Missing | Present (pre-step token validation) | Entirely absent |
| `POST /activate/request` | Missing | Present (resend activation) | Entirely absent |

#### Missing controller methods vs FormWire (`auth_controller.ts`)

| Method | Adonia stub | FormWire | Notes |
|--------|-------------|----------|-------|
| `logout` | Missing | Present | Entirely absent |
| `validatePasswordReset` | Missing | Present | Entirely absent |
| `sendAccountActivationEmail` | Missing | Present | Entirely absent |
| Bouncer policies | Not used | `UserPolicy.authorize('create')`, `PasswordResetPolicy.authorize('reset')` | Not stubbed |

#### Missing validators vs FormWire (`auth_user_validator.ts`)

| Validator/Rule | Adonia stub | FormWire | Notes |
|----------------|-------------|----------|-------|
| Email uniqueness (register) | `vine.string().email()` only | `.unique({ table: 'users' })` | Duplicate emails not rejected at validation |
| Email existence (reset) | No check | `.exists({ table: 'users' })` | No fail-fast for non-existent email |
| Token validity | No check | `.validToken({ table: 'password_resets' })` | Invalid tokens not rejected at validation |
| Password strength | `minLength(8)` only | `.validPassword()` (upper+lower+number+8+) | Weaker validation |
| Password confirmation | Missing | `.confirmed()` on register and reset | No confirmation field |
| Email normalization | Missing | `.normalizeEmail()` on all email fields | Inconsistent casing |
| Name constraints | `string().optional()` | `string().trim().maxLength(80).optional()` | Missing trim/maxLength |

#### Missing custom VineJS rules (not stubbed at all)

FormWire registers four custom VineJS macros via `providers/vine_provider.ts`:
- `unique({ table, column })` — database uniqueness check
- `exists({ table, column })` — database existence check
- `validToken({ table, column })` — password reset token validity
- `validPassword()` — password strength (upper+lower+number+8+)

These require a provider (`vine_provider.ts`) and four rule files under `app/validators/rules/`.

#### Architectural difference

- **FormWire**: session-cookie auth (`auth.use('web').login(user)`)
- **Adonia stubs**: access-token auth (`new LucidAccessTokenSession(ctx)`)

This is an intentional design choice, not a gap.

---

### Account module (`registry/account/`) — stubs DONE

Host HTTP surface is in `stubs/` (`adonia add account --with-stubs --with-routes`).
Domain `AccountService` is unchanged; prefs/inbox use Lucid models in the stub
controller. Auth middleware and `accountLimiter` are commented, same as auth.

#### Routes vs FormWire (`start/routes/account.ts`)

| Route | Adonia stub | FormWire | Notes |
|-------|-------------|----------|-------|
| `GET /user` | Present | Present | `getAuthenticatedUser` |
| `GET /notifications` | Present | Present | Notification preferences |
| `PUT /notifications` | Present | Present | Update preferences |
| `DELETE /account` | Present | Present | Account deletion |
| `GET /inbox` | Present | Present | Inbox notifications |
| `POST /inbox/read-all` | Present | Present | Mark all read |
| `PATCH /inbox/:id` | Present | Present | Mark one read |

#### Controller methods vs FormWire (`accounts_controller.ts`)

| Method | Adonia stub | FormWire | Notes |
|--------|-------------|----------|-------|
| `getAuthenticatedUser` | Present | Present | |
| `getNotifications` | Present | Present | Lucid User columns |
| `updateNotifications` | Present | Present | Lucid User columns |
| `getInboxNotifications` | Present | Present | Needs notification model stub |
| `markNotificationRead` | Present | Present | Needs notification model stub |
| `markAllNotificationsRead` | Present | Present | Needs notification model stub |
| `deleteAccount` | Present | Present | Calls `AccountService.deleteAccount` |

#### Validators vs FormWire

| Field | Adonia stub | FormWire | Notes |
|-------|-------------|----------|-------|
| Notification preferences | Present | Present | Four booleans, optional |
| Password confirmation | Present | Present | `.confirmed()` on `newPassword` |
| Email normalization | Present | Present | `.normalizeEmail()` on replaceEmail |
| Name constraints | Present | Present | `trim().maxLength(80).optional()` |

---

## Part 2 — Missing infrastructure

### Middleware (not in module system at all)

| Middleware | Purpose | Present in Adonia |
|------------|---------|-------------------|
| `force_json_response_middleware` | Forces `Accept: application/json` on all requests | No |
| `container_bindings_middleware` | Binds HttpContext and Logger to container | No |
| `initialize_bouncer_middleware` | Bouncer setup per request | No |
| `auth_middleware` | Named auth guard | No (comment in stub says "wrap as needed") |
| `guest_middleware` | Named guest guard | No (comment in stub says "wrap as needed") |
| `silent_auth_middleware` | Optional silent auth check | No |

### Rate limiting

| Limiter | FormWire | Adonia |
|---------|----------|--------|
| `authLimiter` (5 req/min) | On register, login, reset | Stub in `start/limiter.ts`; commented `.use(authLimiter)` |
| `throttle` (60 req/min) | On all account routes | `accountLimiter` (60/min); commented `.use(accountLimiter)` |
| `submitLimiter` (30 req/min/IP/form) | On public submission | Not provided |

FormWire defines these in `start/limiter.ts`. Adonia ships `authLimiter`
and `accountLimiter` in the auth start stub; `.use(...)` stays commented
until the host runs `node ace add @adonisjs/limiter`.

### Notification wiring

| Component | FormWire | Adonia |
|-----------|----------|--------|
| `notificationRegistry` | Maps types to email+app handlers | Not provided |
| Mail templates (10 files) | verify_email, welcome, reset_password, etc. | Not provided |
| `start/events.ts` wiring | Connects domain events to notification sends | Not provided |

### Health checks

FormWire registers liveness/readiness probes in `start/health.ts` (disk, memory, DB, Redis).
Adonia does not provide health check setup.

---

## Part 3 — Missing test coverage

| Area | Covered | Gap |
|------|---------|-----|
| `list` command | Yes | `cli.test.ts` list without config + after init/add |
| `--dry-run` flag | Yes | `init --dry-run` and `add --dry-run` write nothing |
| `--with-tests` flag | Yes | `add auth --with-tests` copies `modules/auth/tests` |
| npm dependency installation | No | `installNpmDeps()` not tested |
| Env key reporting | No | Missing env key output not tested |
| Registry resolution (bundled) | Partial | Bundled fallback tested only in pack_smoke |
| `check --strict` | Yes | Warnings-as-failures after `init --wire` |
| `schema/adonia.schema.json` | No | JSON schema not validated |
| Dependency cycle detection | No | `expandDependencies` cycle error not tested |
| `constants_merge` logic | No | Not unit tested |
| `config_merge` logic | No | Not unit tested |
| `diff` with stubs | No | `diff --with-stubs` not tested |
| `add` multiple modules | No | `add auth account` not tested |
| `init --scaffold --overwrite` | No | Recopy path not tested |
| Legacy `modules.json` migration | Partial | Read fallback tested; write path not tested |

---

## Part 4 — What should NOT be extracted (FormWire-specific)

These are FormWire product features, not generic Adonia modules:

| Feature | Reason |
|---------|--------|
| `FormService` / Forms CRUD | Core product entity |
| `SubmissionService` / Submissions | Core product entity |
| `WebhookService` / inbound processing | Core product — spam/threat detection, schema validation |
| `IntegrationService` / third-party dispatch | Core product — webhook dispatch, retry logic |
| `TagService` / Tag management | Coupled to form-tag relationship |
| `BillingController` | Combines creem + subscription into FormWire-specific billing UI |
| `initialize_bouncer_middleware` | FormWire-specific abilities/policies |
| All mail templates | FormWire-specific notification content |

---

## Recommended implementation order

1. **Auth module stubs** — DONE
2. **Account module stubs** — DONE
3. **Add `list` and `--dry-run` tests** — DONE
4. **Add `--with-tests` and `check --strict` tests** — DONE
5. **Update cli-hardening.md spec** — mark all items as done
6. **Add CHANGELOG entry** — document breaking change (stub default inverted, `--skip-stubs` removed)
