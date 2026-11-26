# Phase 00 — Foundation

| | |
|---|---|
| **Phase** | 00 (`phase-00-foundation`) |
| **Title** | Foundation: make the stack build, migrate, seed and log in end-to-end |
| **Completed** | 2026-11-26 |
| **Status** | `COMPLETED` |
| **Base commit** | `281e791` (changes are uncommitted in the working tree) |

---

## 1. Objective & Scope

Fix the blockers from `docs/REVIEW.md` §3 that kept the app from running, as specified in `CLAUDE.md` §6 Phase 0:

- Prisma schema and migrations in the wrong places, a noisy migration history, a stale generated client committed to the repo, and a seed that wasn't wired up.
- Three different spellings for roles (`SuperAdmin` / `SUPER_ADMIN` / `SUPERADMIN`), so `RolesGuard` never passed.
- A hardcoded `JWT_SECRET` fallback (`'dev_secret'`), no `/api` prefix, no CORS and no dev proxy.
- A broken frontend build (bad import, Tailwind v3 directives on v4), two competing login implementations, and the login payload sending `email` where the API expects `username`.

**Out of scope (deliberately left for later phases):** guarding `/api/records`, taking the author from the JWT, `GET /auth/me`, enforcing the change-password flow, the `isActive` check in the JWT strategy, throttling, helmet (all Phase 1); the `Record` data model reshape, AuditLog and the UI from the mocks (Phase 2); the root workspace, unified compose and README (Phase 3).

---

## 2. Changes Executed

### Database / Prisma
- **Schema moved to its default location:** `backend/src/database/prisma/schema.prisma` → `backend/prisma/schema.prisma`, next to `backend/prisma/migrations/`. The Prisma CLI now finds both without `--schema`.
- **`prisma.config.ts` added** (replaces the deprecated `package.json#prisma`, which goes away in Prisma 7): it declares the schema path, the migrations path and `seed: 'tsx prisma/seed.ts'`. It loads `.env` through `import 'dotenv/config'`, because Prisma stops auto-loading `.env` once a config file exists.
- **Roles unified:** enum `RoleUser { User Admin SuperAdmin }` → **`Role { USER ADMIN }`**; column `User.rol` → **`User.role`**.
- Removed `moduleType = "esm"` from the `prisma-client-js` generator. That option belongs to the newer `prisma-client` generator.
- **Migration history squashed:** removed the 5 old migrations (`init`, `init2` twice, `init3`, `init4`); a single clean `20261126030235_init` was generated from the current schema.
- **Stale generated client deleted:** `backend/src/database/generated/**` (10 files, from a different generator, never imported).
- **Seed rewritten** (`backend/prisma/seed.ts`): creates one **`ADMIN`** user from env vars with no hardcoded credentials. It fails if `SEED_ADMIN_PASSWORD` is missing, defaults to `mustChangePassword: true`, and is idempotent (it skips the user if one already exists).
- The `Register` model is otherwise **unchanged** (fields `ex, if_code, motivo, reparticion, pase, dia, user_id`). Phase 2 reshapes it into `Record` per CLAUDE.md §3.1.

### Backend
- **Config with fail-fast validation:** `@nestjs/config` (v12) + `joi` (v18). `ConfigModule.forRoot({ isGlobal, cache, validationSchema })` with schema `src/config/env.validation.ts`:
  - `DATABASE_URL` required (a postgres URI).
  - `JWT_SECRET` required, **minimum 32 characters, no fallback**.
  - `JWT_EXPIRES_IN` must be an `ms` duration *with a unit* (`15m`, `8h`, `1d`). jsonwebtoken reads a unitless string as milliseconds, so the unit is required.
  - `PORT` (default 3000), `CORS_ORIGIN` (default `http://localhost:5173`), `NODE_ENV`.
  - Note: `@nestjs/config` v12 takes a **Standard Schema** validator, so `validationOptions` was removed. Joi 18 implements Standard Schema; `abortEarly:false` is set on the schema itself through `.prefs()`.
- **`JwtModule.registerAsync`** + `JwtStrategy` both read `JWT_SECRET` from `ConfigService`. Both `'dev_secret'` fallbacks are removed.
- **`main.ts`:** `app.setGlobalPrefix('api')`; `app.enableCors({ origin: CORS_ORIGIN.split(',') })`; ValidationPipe unchanged; Swagger moved to **`/api/docs`**; removed `import 'dotenv/config'` (ConfigModule loads `.env`); `void bootstrap()`.
- **Roles:** deleted `src/common/enums/role.enum.ts`. `@Roles()`, `RolesGuard`, `CreateUserDto`, `CreateUserData`, `UserResponse` and the JWT payload now all use Prisma's `Role`. `RolesGuard` compares directly with typed request access, and an empty `@Roles()` lets everyone through. Removed `mapRoleToPrisma()` and `user.rol.toUpperCase()`. The users endpoint is `@Roles(Role.ADMIN)`.
- `AuthService` signs `{ sub, role: user.role }`. `JwtStrategy` exports `JwtPayload` / `AuthenticatedUser` types.
- `CreateUserDto`: added `@IsNotEmpty` and `@MaxLength` to `username` / `name`.
- Lint-driven fixes: added `@types/passport-jwt` (the strategy was `error`-typed, which was hidden behind an `eslint-disable`); `record.service.ts` update mapping typed as `Partial<Register>` instead of `any`; removed an unused import.
- Deleted the broken, unused `auth/.../responses/user.response.ts` (`userResonse`).
- `record.controller.spec.ts` now provides a mock `IRecordService` (it couldn't resolve its dependencies before).
- **Prettier applied to the whole backend** (`src`, `test`, `prisma/seed.ts`, `prisma.config.ts`). Many files show diffs that are **formatting only**: 4-space indentation → 2, which is the repo's own `.prettierrc`.

### Frontend
- **Tailwind v4:** `src/index.css` → `@import "tailwindcss";`; deleted `tailwind.config.js` (v3 style, unused by v4); `postcss.config.js` keeps only `@tailwindcss/postcss`; removed the `autoprefixer` dependency (v4 adds vendor prefixes itself). The built CSS went from an empty bundle to 12 kB of real utilities.
- **Duplicate login removed:** deleted `features/auth/components/LoginForm.tsx`, `hooks/useLogin.ts`, `api/login.api.ts` (the cause of the build break), `types/types.ts`, and the unused global `src/types/index.ts`.
- **Types aligned with the API:** `LoginCredentials { username, password }` and `LoginResponse { accessToken, mustChangePassword }` in `features/auth/types/index.ts`.
- **`LoginPage`:** a `username` field instead of `email`; Spanish UI (*INICIAR SESIÓN*, *Usuario*, *Contraseña*, *Ingresar*); separate messages for 401 / network / other errors; `role="alert"`; submit disabled while loading or while a field is empty.
- **`AuthProvider` / `auth-context`:** removed the phantom `user` object (the API never returned one). The context now exposes `isAuthenticated`, `mustChangePassword`, `isLoading`, `login`, `logout`.
- **Token storage:** `storage.ts` stores the **raw JWT** under `office_registry_token`. Before, a `JSON.stringify`'d value was stored under `app_token`, while the dead hook used `token`.
- **`api-client.ts`:** `baseURL` defaults to same-origin **`/api`**. The 401 interceptor **skips `/auth/login`**, so wrong credentials show an error message instead of reloading the page.
- **`vite.config.ts`:** dev proxy `/api` → `VITE_API_PROXY_TARGET` (default `http://localhost:3000`).
- `PrivateLayout`: Spanish labels; removed the `user?.name` reference (comes back in Phase 1 with `/auth/me`).
- `index.html`: `lang="es-AR"`, title *Registro de Expedientes*.
- `package.json`: added a `typecheck` script (`tsc -b`).

### Infrastructure / Config
- **`backend/AGENTS.md` removed.** It was outdated (wrong schema path, wrong `start:prod`) and is replaced by the root `CLAUDE.md`. (It was already deleted in the working tree; the deletion is confirmed as part of this phase.)
- **`backend/.env.example`** and **`frontend/.env.example`** created, documenting every variable.
- **`backend/.gitignore`:** replaced the ineffective `/generated/prisma` with `/generated/`, `/src/database/generated/`, `/prisma/generated/`; added `!.env.example`. `.env` was already ignored in both packages (verified with `git check-ignore`).
- **`backend/docker-compose.yml`:** compose project `office-registry`, container `office_registry_db`; credentials come from `.env` (`POSTGRES_PASSWORD` is required, `root/root` is gone); port bound to **`127.0.0.1:${POSTGRES_PORT:-5432}`**; `restart: unless-stopped`.
- **`backend/package.json`:** renamed `sheet-regiter` → `office-registry-backend`; `start:prod` → `node dist/main`; new scripts `typecheck`, `lint:check` (lint without `--fix`), `db:generate`, `db:migrate`, `db:deploy`, `db:seed`; `lint` now also covers `prisma/seed.ts` and `prisma.config.ts`. New deps: `@nestjs/config`, `joi`, dev `@types/passport-jwt`.
- **`backend/tsconfig.build.json`:** excludes `prisma/` and `prisma.config.ts`, so the build output is `dist/main.js` (it was `dist/src/main.js`).

---

## 3. File Manifest

**Created**
```
backend/.env.example
backend/prisma.config.ts
backend/prisma/schema.prisma                       (moved from src/database/prisma/)
backend/prisma/seed.ts                             (moved + rewritten)
backend/prisma/migrations/20261126030235_init/migration.sql
backend/prisma/migrations/migration_lock.toml      (regenerated)
backend/src/config/env.validation.ts
frontend/.env.example
docs/logs/phase-00-foundation.md
docs/logs/INDEX.md
```

**Modified (functional changes)**
```
backend/.gitignore
backend/docker-compose.yml
backend/package.json, backend/pnpm-lock.yaml
backend/tsconfig.build.json
backend/src/main.ts
backend/src/app.module.ts
backend/src/common/decorators/roles.decorator.ts
backend/src/common/guards/roles.guard.ts
backend/src/modules/auth/auth.module.ts
backend/src/modules/auth/application/services/auth.service.ts
backend/src/modules/auth/application/strategies/jwt.strategy.ts
backend/src/modules/users/api/controllers/user.controller.ts
backend/src/modules/users/application/models/requests/createUser.request.ts
backend/src/modules/users/application/models/requests/createUserData.requets.ts
backend/src/modules/users/application/models/responses/user.response.ts
backend/src/modules/users/application/services/user.service.ts
backend/src/modules/users/infrastructure/persistance/user.repository.ts
backend/src/modules/records/application/services/record.service.ts
backend/src/modules/records/application/models/requests/update-record.request.ts
backend/src/modules/records/api/controllers/record.controller.spec.ts
frontend/index.html
frontend/package.json, frontend/pnpm-lock.yaml
frontend/postcss.config.js
frontend/vite.config.ts
frontend/src/index.css
frontend/src/services/api-client.ts
frontend/src/shared/utils/storage.ts
frontend/src/layouts/PrivateLayout.tsx
frontend/src/features/auth/pages/LoginPage.tsx
frontend/src/features/auth/context/AuthProvider.tsx
frontend/src/features/auth/context/auth-context.ts
frontend/src/features/auth/services/auth.service.ts
frontend/src/features/auth/types/index.ts
```

**Modified (Prettier formatting only)**: the rest of `backend/src/**` and `backend/test/app.e2e-spec.ts`.

**Deleted**
```
backend/AGENTS.md
backend/prisma/migrations/20260109184242_init/
backend/prisma/migrations/20260115220726_init2/
backend/prisma/migrations/20260115220742_init2/
backend/prisma/migrations/20260121010210_init3/
backend/prisma/migrations/20260124211202_init4/
backend/src/database/generated/prisma/**            (10 files)
backend/src/database/prisma/schema.prisma           (moved)
backend/src/database/prisma/seed.ts                 (moved)
backend/src/common/enums/role.enum.ts
backend/src/modules/auth/application/models/responses/user.response.ts
frontend/tailwind.config.js
frontend/src/types/index.ts
frontend/src/features/auth/api/login.api.ts
frontend/src/features/auth/components/LoginForm.tsx
frontend/src/features/auth/hooks/useLogin.ts
frontend/src/features/auth/types/types.ts
```

---

## 4. Environment & Migration Notes

### New / changed env variables (`backend/.env`)
| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Postgres URI; must match `POSTGRES_*` |
| `JWT_SECRET` | ✅ | — | ≥ 32 characters. App refuses to start without it |
| `JWT_EXPIRES_IN` | | `1d` | Must include a unit (`15m`, `8h`, `1d`) |
| `PORT` | | `3000` | |
| `CORS_ORIGIN` | | `http://localhost:5173` | Comma-separated |
| `NODE_ENV` | | `development` | |
| `POSTGRES_USER` / `POSTGRES_DB` | | `registry` / `registerdb` | Read by docker-compose |
| `POSTGRES_PASSWORD` | ✅ (compose) | — | |
| `POSTGRES_PORT` | | `5432` | Host port of the dev DB |
| `SEED_ADMIN_USERNAME` | | `admin` | |
| `SEED_ADMIN_NAME` | | `Administrador` | |
| `SEED_ADMIN_PASSWORD` | ✅ (seed) | — | |
| `SEED_ADMIN_MUST_CHANGE_PASSWORD` | | `true` | |

Frontend (`frontend/.env`, optional): `VITE_API_URL` (default `/api`), `VITE_API_PROXY_TARGET` (default `http://localhost:3000`).

### Migration
- **Destructive for existing dev databases:** the history was rewritten. Any DB created from the old migrations must be dropped and recreated (`prisma migrate reset`). There was no production data.
- New single migration: `20261126030235_init` (enum `Role`, tables `User`, `Register`, unique `User_username_key`, FK `Register.user_id → User.id ON DELETE RESTRICT`).

### Seed credentials
- One user: **`admin`** / role `ADMIN` / `mustChangePassword: true`.
- The password is **not in the repo**. It's the `SEED_ADMIN_PASSWORD` value in the local, git-ignored `backend/.env`. Locally that was a random 16-character value generated during this phase, along with a random `JWT_SECRET` and DB password.

### Local environment used for verification
- Node 26.10.0 on Windows 11. Postgres 16 in **Docker inside WSL (Debian)**.
- **Port 5432 belongs to another project's container** (`juventus-abonos-postgres`), so this project's DB ran on **`POSTGRES_PORT=5433`**. The other container was not touched.
- **Port 5173 is also used by another project's dev server**, so the Vite proxy check ran on **5174**.
- The machine's global pnpm is **9.15.4**, which rejects these `pnpm-workspace.yaml` files (they lack a `packages:` field; that syntax needs pnpm 10). All commands ran with **`npx pnpm@10`** (10.34.9). Lockfiles stayed at `lockfileVersion: '9.0'`.

### Commands to reproduce from scratch
```bash
cd backend
cp .env.example .env                     # fill JWT_SECRET, POSTGRES_PASSWORD, DATABASE_URL, SEED_ADMIN_PASSWORD
docker compose up -d --wait              # Postgres
pnpm install
pnpm db:migrate                          # = prisma migrate dev (applies init + generates client)
pnpm db:seed                             # = prisma db seed
pnpm start:dev                           # API on http://localhost:3000/api, Swagger at /api/docs

cd ../frontend
pnpm install
pnpm dev                                 # http://localhost:5173, /api proxied to :3000
```

---

## 5. Verification & Test Results

### Baseline (before changes)
| Command | Result |
|---|---|
| `backend: pnpm build` | ❌ 6 errors (`RoleUser`, `Register`, `User` not exported by `@prisma/client`) |
| `frontend: pnpm build` | ❌ TS2305 / TS6133 in `login.api.ts` |

### Backend
| Command | Result |
|---|---|
| `npx prisma migrate dev --name init` | ✅ created and applied `20261126030235_init`, generated the client (no `--schema` flag) |
| `pnpm db:seed` (1st run) | ✅ `Seed: created ADMIN "admin" (mustChangePassword=true).` |
| `pnpm db:seed` (2nd run) | ✅ `Seed: user "admin" already exists, skipping.` (idempotent) |
| `npx prisma migrate status` | ✅ `1 migration found… Database schema is up to date!` |
| DB check | ✅ `admin / ADMIN / isActive=true / mustChangePassword=true / bcrypt $2b$10$…` |
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint:check` | ✅ exit 0, **0 errors, 0 warnings** (174 problems before) |
| `npx prettier --check …` | ✅ all files formatted |
| `pnpm build` | ✅ exit 0, output `dist/main.js` |
| `pnpm test` | ✅ 1 suite, 1 test passed |
| `JWT_SECRET= node dist/main.js` | ✅ refuses to start: `Config validation error: "JWT_SECRET" is not allowed to be empty`, exit 1 |
| `JWT_SECRET=short node dist/main.js` | ✅ refuses to start: `length must be at least 32 characters long` |
| Startup log | ✅ all routes mapped under `/api` (`/api/auth/login`, `/api/users`, `/api/records…`) |

### Live end-to-end (built backend `node dist/main.js` + real Postgres)
Script: `verify-login.mjs`. It reads the seed password from `.env` and never prints secrets.

| Check | Direct `:3000/api` | Through Vite proxy `:5174/api` |
|---|---|---|
| `POST /api/auth/login` (admin) → **201**, 3-part JWT, `mustChangePassword=true` | ✅ | ✅ |
| JWT payload: `sub`, **`role=ADMIN`**, `exp−iat = 24h` | ✅ | ✅ |
| Wrong password → 401 | ✅ | ✅ |
| Old `{ email, password }` payload → 400 (whitelist) | ✅ | ✅ |
| Route without `/api` prefix → 404 | ✅ | ✅ |
| **ADMIN `POST /api/users` → 201** (RolesGuard passes; returned 403 for everyone before) | ✅ | ✅ |
| USER `POST /api/users` → 403 (RolesGuard denies) | ✅ | ✅ |
| `POST /api/users` without a token → 401 | ✅ | ✅ |
| CORS preflight from `http://localhost:5173` → `allow-origin` echoed | ✅ | n/a |
| CORS preflight from another origin → no `allow-origin` | ✅ | n/a |

The Vite dev server also served `index.html` with `lang="es-AR"` and the new title, and `src/index.css` compiled through Tailwind v4. Both temporary `phase0_check_*` users created by the script were deleted afterwards; the DB contains only `admin`.

### Frontend
| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc -b`) | ✅ exit 0 |
| `pnpm lint` | ✅ 0 problems |
| `pnpm build` | ✅ 107 modules; `index.css` 12.00 kB (Tailwind utilities present: `.bg-white`, `.shadow`, `.text-red-700`) |

Harmless noise: Node 26 prints `DEP0205 module.register() is deprecated` from `tsx` / Vite tooling.

---

## 6. Known Limitations / Next Phase Handoff

**Still open on purpose (Phase 1 — `phase-01-core-security`):**
- 🔴 **`/api/records` is still unauthenticated**, and `user_id` still comes from the request body.
- `mustChangePassword` is returned but **not enforced** (no `POST /api/auth/change-password`, and tokens aren't restricted). Note: the seeded admin has `mustChangePassword: true`, so the Phase 1 flow is needed before the admin can use the app normally.
- No `GET /api/auth/me`. The frontend keeps `mustChangePassword` only in memory (lost on reload) and shows no user name.
- `JwtStrategy.validate()` doesn't check `isActive`. No login throttling, no `helmet`. Swagger (`/api/docs`) is always on.
- `test/app.e2e-spec.ts` is still the Nest template (expects `GET / → "Hello World!"`) and **fails**. It wasn't touched because it needs a test DB. Replace it with a login e2e test.

**Phase 2 notes:**
- The `Register` model / `records` module keep the legacy field names (`if_code`, `motivo`, `dia`, `user_id`, `pase` required). Reshape into `Record` (`date, ex, ifCode, subject, department, forwarding?`, audit fields, `deletedAt`) per CLAUDE.md §3.1, with a new migration.
- `User` has no `dni` yet; it uses `name` (CLAUDE.md says `fullName`).
- The over-engineered `I*Service` / `I*Repository` layering (CLAUDE.md §4) is still there. Simplify it as modules get rewritten.

**Tooling / repo (decide early, Phase 1 or 3):**
- The root pnpm workspace from CLAUDE.md §1 is **not created yet**. `backend/` and `frontend/` still have their own `pnpm-workspace.yaml` + lockfile. Creating a root workspace merges the lockfiles (re-resolves dependencies), so it was left out of this phase.
- Pin the package manager (`"packageManager": "pnpm@10.x"`) or upgrade pnpm globally. Global pnpm 9 can't install these packages.
- `@nestjs/config` resolved to **v12** (Standard Schema API). If you prefer, Zod can replace Joi here and be shared with the frontend.
- On this machine, use `POSTGRES_PORT=5433` and a free Vite port while the other project's containers and dev server are running.
- Not verified: a manual browser click-through of the login form (no browser automation was used). The same `/api/auth/login` call the form makes was verified through the Vite proxy, and the form compiles against the new types.
