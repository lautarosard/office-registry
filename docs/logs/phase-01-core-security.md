# Phase 01 — Core Security

| | |
|---|---|
| **Phase** | 01 (`phase-01-core-security`) |
| **Title** | Core security: authenticated API, forced password change, revocation and hardening |
| **Completed** | 2026-11-26 |
| **Status** | `COMPLETED` |
| **Base commit** | `560cd9f` (Phase 0) |
| **Branch** | `phase-00-01-foundation-security` |

---

## 1. Objective & Scope

Close the security gaps left open by Phase 0 (`CLAUDE.md` §6 Phase 1):

- `/api/records` was unauthenticated and the client chose the author (`user_id` in the body).
- No `GET /api/auth/me`; `mustChangePassword` was returned but never enforced.
- Deactivated or deleted users kept working until their token expired.
- No `helmet`, no login throttling, Swagger always on, Prisma errors surfaced as 500.
- The frontend lost session details on reload and had no change-password screen.
- The e2e test was still the Nest template and failed.

**Out of scope (Phase 2):** ownership rules (`USER` vs `ADMIN` on edit/delete), soft delete, AuditLog, the `Record` reshape, search/pagination, Users CRUD and the remaining UI from `docs/mock/`.

---

## 2. Changes Executed

### Database / Prisma
- No schema changes and no new migration.

### Backend
**Authentication model**
- `JwtAuthGuard` is now a **global guard** (`APP_GUARD` in `AuthModule`): every route requires a token unless marked `@Public()`. Only `POST /api/auth/login` is public. New controllers are protected by default.
- `MustChangePasswordGuard` is the second global guard. A restricted user gets **403** `{ code: 'PASSWORD_CHANGE_REQUIRED' }` everywhere except routes marked `@AllowMustChangePassword()` (`me`, `change-password`).
- `JwtStrategy.validate()` re-reads the user on every request: **401** if missing or `isActive === false`. `role` comes from the DB, so role changes apply immediately.
- The JWT payload gained a `mustChangePassword` claim. A request is restricted if **the DB flag or the claim** is set:
  - a token issued for a temporary password stays restricted after the owner changes it;
  - an admin reset applies to tokens already issued;
  - tokens without the claim (issued before this phase) are restricted, so those users must log in again.

**Endpoints**
- `GET /api/auth/me` → `{ id, username, name, role, isActive, mustChangePassword }`.
- `POST /api/auth/change-password` `{ currentPassword, newPassword }` → **200** `{ accessToken, mustChangePassword: false }`.
  - New password: at least 8 characters, a letter and a number, at most 72 bytes (bcrypt ignores the rest), different from the current one. Messages in Spanish.
  - A wrong current password is **400**, not 401, so the frontend doesn't treat it as an expired session.

**Records**
- `user_id` removed from `CreateRecordRequest` and `UpdateRecordRequest`. Sending it is now **400** (`forbidNonWhitelisted`).
- On create, the author is `req.user.userId` (new `@CurrentUser()` decorator), passed through service and repository.
- Updates never change the author.

**Hardening**
- New `src/app.setup.ts` holds the HTTP setup (helmet, `/api` prefix, CORS, ValidationPipe, Swagger), shared by `main.ts` and the e2e tests.
- `helmet()` enabled.
- Swagger is **not registered when `NODE_ENV=production`**.
- `@nestjs/throttler` on `login` and also on `change-password` (it verifies a password too): default **5 requests per 60 s per IP per route** → **429** with a Spanish message. Configurable by env.
- Global `PrismaExceptionFilter`: `P2025` → 404, `P2002` → 409; other codes stay 500.

**Cleanup**
- Removed the abstract `IAuthService` (CLAUDE.md §4); `AuthController` injects `AuthService` directly. The `I*` layers in `records` / `users` remain.
- Added `findById` to the user repository. `UsersController` now declares only `RolesGuard`.

### Frontend
- **Session hydration:** `AuthProvider` loads `GET /api/auth/me` through TanStack Query on startup/reload. The context exposes `user`, `isAuthenticated`, `mustChangePassword`, `isLoading`, `hasSessionError`, `login`, `changePassword`, `logout`. Logout clears the query cache.
- **Routing:** `ProtectedRoute` shows a loading state, a retry screen if the server can't be reached, and sends restricted users to `/change-password`. `LoginPage` redirects when already authenticated.
- **`/change-password` page** ("Cambiar contraseña"): React Hook Form + Zod mirroring the backend rules, server error display, "Cerrar sesión" when mandatory and "Cancelar" when voluntary.
- **`PrivateLayout`:** navy header with gold divider, the user's name and role (*Administrador* / *Usuario*), "Cambiar contraseña" link and logout.
- **`PublicLayout`:** institutional card (navy header, gold line) shared by login and change-password. Palette tokens added to `index.css`.
- `api-client.ts`: a 403 `PASSWORD_CHANGE_REQUIRED` redirects to `/change-password`.
- `LoginPage`: message for 429.
- `Input`: label linked to its field, `aria-invalid` / `aria-describedby` for errors.

### Infrastructure / Config
- Backend deps: `@nestjs/throttler`, `helmet`.
- Frontend deps: `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`; dev `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`. New `test` script and `vitest.config.ts`.
- E2E harness (`backend/test/`): own database (`<name>_test`, or `TEST_DATABASE_URL`, which must end in `_test`), migrated automatically; runs serially.
- `@nestjs/config` v12 is ESM-only, so `jest-e2e.json` transpiles that one package (`transformIgnorePatterns`, `test/tsconfig.json` with `allowJs`).

---

## 3. File Manifest

**Created**
```
backend/src/app.setup.ts
backend/src/common/decorators/allow-must-change-password.decorator.ts
backend/src/common/decorators/current-user.decorator.ts
backend/src/common/decorators/public.decorator.ts
backend/src/common/filters/prisma-exception.filter.ts
backend/src/common/filters/prisma-exception.filter.spec.ts
backend/src/common/guards/must-change-password.guard.ts
backend/src/modules/auth/application/models/requests/change-password.request.ts
backend/src/modules/auth/application/models/responses/change-password.response.ts
backend/src/modules/auth/application/models/responses/me.response.ts
backend/src/modules/auth/application/validators/max-bytes.validator.ts
backend/test/hardening.e2e-spec.ts
backend/test/tsconfig.json
backend/test/support/{app,database-url,env,global-setup,production-env}.ts
frontend/vitest.config.ts
frontend/src/shared/query-client.ts
frontend/src/features/auth/auth-flow.test.tsx
frontend/src/features/auth/pages/ChangePasswordPage.tsx
frontend/src/features/auth/utils/change-password.schema.ts
frontend/src/features/auth/utils/change-password.schema.test.ts
docs/logs/phase-01-core-security.md
```

**Modified**
```
backend/.env.example, backend/package.json, backend/pnpm-lock.yaml
backend/src/main.ts
backend/src/app.module.ts
backend/src/config/env.validation.ts
backend/src/common/guards/jwt-auth.guard.ts
backend/src/modules/auth/auth.module.ts
backend/src/modules/auth/api/controllers/auth.controller.ts
backend/src/modules/auth/application/services/auth.service.ts
backend/src/modules/auth/application/strategies/jwt.strategy.ts
backend/src/modules/records/api/controllers/record.controller.ts
backend/src/modules/records/application/interfaces/irecord.service.ts
backend/src/modules/records/application/models/requests/create-record.request.ts
backend/src/modules/records/application/models/requests/update-record.request.ts
backend/src/modules/records/application/services/record.service.ts
backend/src/modules/records/domain/iRepository/irecord.repository.ts
backend/src/modules/records/infrastructure/persistance/prisma-record.repository.ts
backend/src/modules/users/api/controllers/user.controller.ts
backend/src/modules/users/domain/iRepository/iuser.repository.ts
backend/src/modules/users/infrastructure/persistance/user.repository.ts
backend/test/app.e2e-spec.ts            (rewritten)
backend/test/jest-e2e.json
frontend/package.json, frontend/pnpm-lock.yaml, frontend/tsconfig.node.json
frontend/src/App.tsx
frontend/src/index.css
frontend/src/features/auth/context/AuthProvider.tsx
frontend/src/features/auth/context/auth-context.ts
frontend/src/features/auth/pages/LoginPage.tsx
frontend/src/features/auth/services/auth.service.ts
frontend/src/features/auth/types/index.ts
frontend/src/layouts/PrivateLayout.tsx
frontend/src/layouts/PublicLayout.tsx
frontend/src/router/ProtectedRoute.tsx
frontend/src/router/index.tsx
frontend/src/services/api-client.ts
frontend/src/shared/components/Button.tsx
frontend/src/shared/components/Input.tsx
docs/logs/INDEX.md
docs/logs/phase-00-foundation.md        (base commit line only)
```

**Deleted**
```
backend/src/modules/auth/application/interfaces/iauth.service.ts
```

---

## 4. Environment & Migration Notes

| Variable | Required | Default | Notes |
|---|---|---|---|
| `LOGIN_THROTTLE_LIMIT` | | `5` | Attempts per window per IP (login and change-password, counted separately) |
| `LOGIN_THROTTLE_TTL_SECONDS` | | `60` | Window length |
| `TEST_DATABASE_URL` | | derived | E2E only. Defaults to `DATABASE_URL` + `_test` |
| `NODE_ENV` | | `development` | `production` now also disables Swagger |

- **No migrations.** Existing databases need nothing.
- **Existing sessions:** tokens issued before this phase are restricted; log in again.
- **Seed:** unchanged. The seeded `admin` has `mustChangePassword: true`; the first login now leads to the change-password screen. The local dev `admin` was **not** changed during verification.
- **E2E database:** `registerdb_test` was created on the dev Postgres. The DB user needs permission to create it.
- **Node:** loading the ESM-only `@nestjs/config` from CommonJS needs Node ≥ 20.19 or ≥ 22.12 (relevant for the Phase 3 Docker image). Verified on Node 26.10.0.

---

## 5. Verification & Test Results

Environment: Windows 11, Node 26.10.0, `npx pnpm@10`, Postgres 16 in Docker (WSL) on port 5433.

### Static checks and tests
| Command | Result |
|---|---|
| `backend: pnpm typecheck` | ✅ exit 0 |
| `backend: pnpm lint:check` | ✅ exit 0 |
| `backend: pnpm build` | ✅ exit 0 |
| `backend: prettier --check "src/**/*.ts" "test/**/*.ts"` | ✅ all formatted |
| `backend: pnpm test` | ✅ 2 suites, 4 tests |
| `backend: pnpm test:e2e` | ✅ 2 suites, **17 tests** |
| `frontend: pnpm typecheck` | ✅ exit 0 |
| `frontend: pnpm lint` | ✅ exit 0 |
| `frontend: pnpm build` | ✅ 253 modules (zod prints a harmless Rollup comment-annotation warning) |
| `frontend: pnpm test` | ✅ 2 files, **11 tests** |

### E2E coverage (real Postgres)
- Login success, wrong password, unknown user; `me` shape (no password); missing/forged token → 401.
- Restricted user: `me` allowed; records and users → 403; wrong current password and weak passwords → 400; after the change the new token works, the old one stays 403, the old password fails.
- Reset applied to an already issued token.
- `isActive: false` → 401 on token and login; deleted user → 401; role downgrade applied without a new login.
- All five record endpoints → 401 without a token; author bound from the JWT; `user_id` rejected on create and update; author kept on update; unknown id → 404.
- Production mode: `/api/docs` and `/api/docs-json` → 404; helmet headers present; 429 with `Retry-After`.
- Prisma filter mapping is covered by a unit test.

### Live check in a real browser
Built backend + Vite dev server + headless Edge (Playwright), against the `_test` database with a temporary seeded admin. 12/12 passed: redirect to login; wrong-password message; temporary password → change page, also after navigating to `/dashboard`; Spanish validation; server error keeps the session; successful change → dashboard; reload keeps session with name and role; re-login with the new password; no unexpected console errors; Swagger renders under helmet in development; default limit returns 429. The script was temporary and is not in the repo.

---

## 6. Known Limitations / Next Phase Handoff

**Open until Phase 2 — important**
- 🔴 **No ownership enforcement yet:** any authenticated user can edit or delete **any** record.
- 🔴 `DELETE /api/records/:id` is still a **hard delete**. No `deletedAt`, `updatedById` or AuditLog.

**Security notes**
- **Changing a password does not end other sessions** that were opened with a normal (non-temporary) password; they live until `JWT_EXPIRES_IN`. Fixing it needs a column such as `tokenVersion` / `passwordChangedAt`. Phase 2 adds a migration and is a good place. Deactivation does revoke immediately.
- **Throttling behind Nginx (Phase 3):** the limit is per client IP. Behind a reverse proxy every PC shows up as the proxy, so the whole office would share 5 logins per minute. Phase 3 must configure `trust proxy` for the Nginx hop and forward `X-Forwarded-For`.
- Throttle counters are in memory and reset on restart. Successful logins count toward the limit.
- The JWT is kept in `localStorage` (unchanged from Phase 0).
- Temporary passwords are still 8 hex characters (`generateTempPassword`).

**UI**
- The PFA badge from the mocks is not included: the repo has no badge asset. Add the official image (e.g. `frontend/public/`) for Phase 2.
- The dashboard is still a placeholder; role-based navigation comes with Phase 2.

**Phase 2 notes**
- The `Register` model keeps its legacy field names; reshape into `Record` per CLAUDE.md §3.1.
- Use `@CurrentUser()` for `createdById` / `updatedById` and ownership checks.
- When Users CRUD adds password reset, setting `mustChangePassword: true` is enough to restrict live tokens.
- The root pnpm workspace is still not created (see Phase 0 log).
