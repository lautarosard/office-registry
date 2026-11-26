# Office Registry — Project Review & Feedback

_Review date: 2026-11-25 · Scope: `backend/`, `frontend/`, `docs/mock/` (5 Figma screens) · Based on commit `281e791`_

---

## 1. What the app is (my understanding)

An **internal web app for a Policía Federal Argentina office to log the "expedientes" it handles**, replacing what is today almost certainly a shared spreadsheet (the backend package is literally called `sheet-regiter`).

Each row in the registry records a document movement coming from GDE (the national electronic document system):

| Field | Meaning (inferred) | Example from the mock |
|---|---|---|
| **Fecha** | Date the document was received/processed | `-/-/-` |
| **EX** | GDE *expediente* number | `EX-2025-93504106- -APN-DIFP#PFA` |
| **IF** | GDE *informe* number attached/generated | `IF-2025-93911988-APN-SOPDGA#PFA` |
| **Motivo** | Subject / reason | `Diagramación de servicio` |
| **Repartición** | Originating or destination unit | `DGO#PFA` |
| **Pase** | Where it was forwarded to (may be empty) | `---` |

Plus a small **user administration** area: admins create accounts (ID/DNI, username, full name), the system generates a temporary password, and the user must change it on first login.

**Screens in the mocks**

1. Login (username + password).
2. Expedientes list — search by EX or IF, filter by date range, "Nuevo registro" button, edit icon per row.
3. "Nuevo registro" modal.
4. Usuarios list (only visible to admins — the nav shows the extra tab) with search + "Nuevo usuario".
5. "Nuevo usuario" modal.

## 2. Is it viable?

**Yes — clearly.** It's a small, well-bounded CRUD app with a real user and a real pain (shared spreadsheets: no search, no history, no per-user accountability, concurrent edits). The scope fits one developer, and the chosen stack (NestJS + Prisma + Postgres / React + Vite + Tailwind) is more than enough.

What decides whether it succeeds is not the tech but:

- **Being faster than the spreadsheet** for the daily task (typing an EX/IF and finding it). Search, keyboard-friendly forms and input validation/auto-format of GDE numbers matter more than anything architectural.
- **Traceability.** The one thing a spreadsheet can't give is "who entered/changed this and when". That should be a core feature, and today it isn't (see §4.3).
- **Deployment in an institutional network** (probably on-prem, no cloud, maybe no internet). Plan for a single `docker compose up` deployment from the start.
- **Authorization to use the institutional insignia** (the PFA badge in the mock). Fine for an internal tool built for the force, but confirm it's sanctioned before showing it outside.

Current state: **~20% done.** Backend has login, user creation and record CRUD; frontend has a login page skeleton and an empty dashboard. **Nothing works end-to-end right now** (see §3).

---

## 3. Critical issues (blockers / security)

### 3.1 Records API is completely unauthenticated 🔴
`backend/src/modules/records/api/controllers/record.controller.ts` has `@ApiBearerAuth()` (Swagger doc only) but **no `@UseGuards(JwtAuthGuard)`**. Anyone who can reach the server can list, create, edit and **delete** every record.

### 3.2 Record author is taken from the request body 🔴
`CreateRecordRequest.user_id` / `UpdateRecordRequest.user_id` let the client say who created the record. It must come from the JWT (`req.user.userId`) and never be editable. Otherwise the audit value of the app is zero.

### 3.3 Role check can never pass → nobody can create users 🔴
- The JWT payload stores `role: user.rol` → Prisma enum values `'User' | 'Admin' | 'SuperAdmin'` (`auth.service.ts`).
- `RolesGuard` compares against the app enum `Role` → `'USER' | 'ADMIN' | 'SUPER_ADMIN'` (`common/enums/role.enum.ts`).
- `'SuperAdmin' !== 'SUPER_ADMIN'`, so `POST /users` always returns **403**, even for the seeded superadmin.

There's also `user.rol.toUpperCase()` in `user.service.ts`, which yields `'SUPERADMIN'` (no underscore) — a third spelling. **Fix:** delete the hand-written `Role` enum and use Prisma's `RoleUser` everywhere (or make the Prisma enum values `USER/ADMIN/SUPER_ADMIN` with `@map`). One source of truth.

### 3.4 Frontend and backend don't talk to each other 🔴
Every one of these alone breaks login:

| Problem | Where |
|---|---|
| Frontend sends `{ email, password }`; backend expects `{ username, password }` and has `forbidNonWhitelisted: true` → 400 | `frontend/src/features/auth/pages/LoginPage.tsx`, `features/auth/types/index.ts` |
| Frontend base URL is `http://localhost:3000/api`; backend has no `setGlobalPrefix('api')` → 404 | `frontend/src/services/api-client.ts`, `backend/src/main.ts` |
| Backend never calls `app.enableCors()` and Vite has no proxy → browser blocks the request | `backend/src/main.ts`, `frontend/vite.config.ts` |
| Frontend expects `{ accessToken, user }`; backend returns `{ accessToken, mustChangePassword }` → `user` is always `undefined` | `frontend/src/types/index.ts` |

### 3.5 Hard-coded / fallback secrets 🔴
- `JWT_SECRET || 'dev_secret'` in both `auth.module.ts` and `jwt.strategy.ts`. If the env var is missing in production, tokens are signed with a public string and anyone can forge a SuperAdmin token. **Fail at startup if the secret is missing** (use `@nestjs/config` with validation).
- Seeded SuperAdmin password `SuperAdmin123!` with `mustChangePassword: false` (`seed.ts`). Set it to `true`, or read it from an env var.
- `docker-compose.yml` uses `root/root` and publishes Postgres on `0.0.0.0:5432`. OK for dev; must not ship like that.

### 3.6 Prisma setup is inconsistent — migrations probably don't run 🟠
- Schema lives in `backend/src/database/prisma/schema.prisma`, migrations in `backend/prisma/migrations/`. Prisma looks for migrations **next to the schema**, and there's no `prisma.schema` entry in `package.json` nor a `prisma.config.ts`, so `prisma migrate dev` won't find the schema by default, and with `--schema` it won't find the migrations.
- `backend/src/database/generated/prisma/**` is a committed client produced by a *different* generator (`prisma-client`, ESM) — but the code imports from `@prisma/client`. It's dead, stale code; delete it. The `.gitignore` entry `/generated/prisma` doesn't match its actual path.
- The seed script isn't wired (`"prisma": { "seed": ... }` missing).
- Migration history is noisy (`init2` twice, `email` added and removed, `mustChanguePassword` typo then renamed). Since there's no production data, **squash into one clean `init` migration**.

### 3.7 Frontend build fails 🟠
- `features/auth/api/login.api.ts` imports `LoginRequest` from `../types`, but `types/index.ts` doesn't export it (it's in `types/types.ts`). With `strict` + `noUnusedLocals`, `tsc -b` fails.
- Tailwind **v4** is installed but `index.css` uses v3 directives (`@tailwind base; ...`). In v4 it's `@import "tailwindcss";`. Styles won't load. `tailwind.config.js` + `autoprefixer` are also unnecessary in v4.

---

## 4. Backend — design & quality feedback

### 4.1 Missing features the mocks need
| Mock needs | Backend today |
|---|---|
| Search by EX or IF | ❌ `GET /records` returns everything |
| Filter by date range (Desde / Hasta) | ❌ |
| Pagination / sorting | ❌ `findMany()` with no limit — will degrade with thousands of rows |
| List users, search users | ❌ only `POST /users` |
| Edit user (edit icon) | ❌ |
| Deactivate user | ❌ (`isActive` exists but no endpoint) |
| Change password on first login | ❌ `mustChangePassword` is returned but never enforced, no endpoint |
| Reset a user's password (admin) | ❌ |
| "ID" column = DNI (`45.675.017`) | ❌ User has no DNI field; `id` is a UUID |

Suggested API shape:
```
GET    /api/records?q=EX-2025-...&from=2025-01-01&to=2025-12-31&page=1&pageSize=50&sort=-dia
POST   /api/records
PATCH  /api/records/:id
DELETE /api/records/:id          (soft delete, admin only)
GET    /api/users?q=...
POST   /api/users                → returns temp password once
PATCH  /api/users/:id            (name, role, isActive)
POST   /api/users/:id/reset-password
POST   /api/auth/change-password
GET    /api/auth/me
```

### 4.2 Data model
Current `Register`: `ex, if_code, motivo, reparticion, pase, dia, user_id`.

- **No timestamps.** Add `createdAt`, `updatedAt`.
- **No audit trail.** For a police registry, "who changed what and when" is the main value over a spreadsheet. Add at minimum `createdById`, `updatedById`, and ideally a `RecordHistory` / `AuditLog` table (old/new JSON, user, timestamp).
- **Hard delete.** Use soft delete (`deletedAt`) and restrict delete to admins.
- **`pase` is required (`@IsNotEmpty`)** but the mock shows `---` for every row → it should be optional.
- **No indexes** on `ex`, `if_code`, `dia` — the exact columns you search/filter by. Add `@@index`; for partial search consider `pg_trgm`.
- **No format validation** of EX/IF. GDE numbers follow a pattern (`EX-YYYY-NNNNNNNN- -APN-UNIT#PFA`). Validate with a regex, normalize (trim, uppercase), and consider auto-formatting in the UI. This alone prevents most data-entry garbage.
- **Motivo / Repartición are free text** but values repeat (`DGO#PFA`, `Diagramación de servicio`). Consider a catalog table or at least autocomplete from previous values so the data stays consistent and filterable.
- **Domain question to decide early:** is it one row per *movement* (an EX can appear many times with different IFs/pases), or one row per *expediente* with movements as children? The mock looks like the flat version, which is fine for an MVP — but decide consciously, and don't put a unique constraint on `ex` if it's the former.
- Naming mixes Spanish and English (`Register`/`records`/`dia`/`if_code`/`rol`). Pick one convention for code (English is common) and keep Spanish for UI labels.
- User: add `dni` (unique), `createdAt`, `lastLoginAt`. A FK with `onDelete: Restrict` means users with records can never be deleted — which is correct, so use deactivation instead and expose it.

### 4.3 Auth & security
- No **rate limiting** on `/auth/login` (`@nestjs/throttler`) → trivial brute force.
- Temp password is 8 hex chars (32 bits). OK given forced change, but enforce `mustChangePassword` server-side: tokens issued while it's `true` should only be allowed to call `change-password`.
- No password policy on change (doesn't exist yet).
- JWT valid 1 day, no revocation: a deactivated user keeps access until expiry. Check `isActive` in `JwtStrategy.validate()` (one DB lookup per request is fine at this scale).
- Swagger (`/docs`) is exposed unconditionally — disable in production or protect it.
- No `helmet`, no global exception filter (Prisma `P2025`/`P2002` errors surface as 500s instead of 404/409).
- `UpdateRecordRequest` uses `any` and spreads the DTO straight into Prisma.
- Who can edit/delete records? Decide the rules (e.g. User: create + edit own within N hours; Admin: edit/delete any). Today there are no rules at all.

### 4.4 Architecture
The code uses a Clean/Hexagonal layout (`api/application/domain/infrastructure`, abstract `IService` + `IRepository` per module). For a 2-entity CRUD app this is **over-engineered**: lots of files and indirection, but the layers leak anyway (the "domain" repository interface imports Prisma types and the application's request DTOs). Two options:

- **Simplify (recommended):** controller → service → Prisma. Keep DTOs. Drop the interfaces unless you have a second implementation.
- **Or commit to it properly:** domain entities that don't depend on Prisma, mappers in infrastructure.

Half-clean is the worst of both.

### 4.5 Code hygiene
- `auth/application/models/responses/user.response.ts` is broken (`name; string;`) and unused — delete.
- Typos in identifiers/paths: `sheet-regiter`, `createUserData.requets.ts`, `persistance`, `userResonse`, `changuePass`.
- `CreateUserDto` has no `@IsNotEmpty` / length limits.
- Two parallel role enums (see §3.3).
- Tests: `record.controller.spec.ts` will fail (no providers registered); `test/app.e2e-spec.ts` is the Nest template expecting `GET / → "Hello World!"`, which doesn't exist. Effectively **zero real tests**. Start with service unit tests for auth/users and an e2e test of login → create record → search.
- `README.md` is the untouched Nest template; `AGENTS.md` mentions `prisma/schema.prisma` and `node dist/main` (actual: `src/database/prisma/schema.prisma`, `dist/src/main`).
- Formatting is inconsistent (4-space vs 2-space files) → run `pnpm format` once.
- Config via raw `process.env` read at import time; use `@nestjs/config` with a validated schema and ship a `.env.example`.

---

## 5. Frontend — feedback

The frontend is an early scaffold. Beyond the blockers in §3.4 / §3.7:

- **Two competing login implementations:** `LoginForm` + `useLogin` + `login.api.ts` (username, stores token under `token`, raw) vs `LoginPage` + `AuthProvider` + `auth.service.ts` (email, stores under `app_token`, JSON). Only the second is routed. Delete the first.
- **User is lost on reload:** `isAuthenticated` comes from localStorage but `user` starts as `null` and is never refetched. Add `GET /auth/me` and load it on startup (also tells the UI the role, to show/hide "Usuarios").
- **401 interceptor breaks the login error message:** a bad password returns 401 → interceptor does `window.location.href = '/login'` (full reload) before the page can show "usuario o contraseña incorrectos". Skip the redirect for the login request.
- No handling of `mustChangePassword` (no change-password page).
- No role-based routing (Usuarios must be admin-only in both UI and API).
- UI is generic English Tailwind ("Sign in to your account", "Welcome, User") — nothing from the mocks is implemented yet. `index.html` still has `lang="en"` and `<title>frontend</title>`.
- Missing assets: `/logo-policia.png` doesn't exist; the mock's display font (looks like a wide geometric face, e.g. Eurostile/Michroma-style) isn't set up.
- `cn()` is duplicated in each component — move to `shared/utils`.
- **Recommended additions:** TanStack Query (lists, search, cache invalidation after create/edit), react-hook-form + zod (forms + EX/IF validation, shared schema with the backend if you go monorepo), a small table component with pagination.
- Token in `localStorage` is acceptable for an intranet tool, but an httpOnly cookie is safer against XSS if you want to go further.

---

## 6. Mock (Figma) feedback

Overall the design is clean, consistent and on-brand. Notes, screen by screen:

### General
- **States are missing:** loading, empty ("no hay registros"), no search results, error, success toast after save. Design at least empty + error.
- **Contrast:** light grey text on light grey cells (`#ccc`-ish on `#ddd`) will be hard to read on office monitors, and fails WCAG AA. Darken body text or lighten the cells.
- **Fixed 1920×1080 layout.** Define how it behaves at 1366×768 (very common in public-office PCs): the 6-column table + action column will need to compress or scroll.
- **Confirmar / Cancelar as underlined text links** look like links, not buttons, and the primary action isn't visually dominant. Use a filled primary button + secondary button, consistent with the green "Nuevo registro".
- The logout icon is red and alone; add a tooltip/label and show **who is logged in** (name + role) in the header.

### 1 · Login
- **There's no submit button** ("Ingresar") in the mock.
- No error-state design (wrong credentials, inactive user).
- Missing the **"cambiar contraseña" (first login) screen**, which the backend already models.

### 2 · Expedientes
- Search placeholder "Ingrese EX o IF…" — good. Make the search tolerant (partial numbers like `93504106`, case-insensitive).
- Date placeholders `-/-/-` → use a real date picker with `dd/mm/aaaa`; the Fecha column should show `dd/mm/aaaa` too.
- **No pagination / row count** and no **column sorting** (by date is the obvious default: newest first).
- EX/IF strings are long: allow **copy-to-clipboard** on click, since users will paste them into GDE.
- Consider adding a "Cargado por" column (or show it in a detail view) — it's the audit value.
- **Only an edit icon.** Is there delete? View detail? History? Decide and design it (delete should require confirmation and probably be admin-only).
- An **export to Excel/CSV** button will likely be requested on day one by people used to the spreadsheet — cheap to add.
- "Pase" shows `---` for every row → it's optional in practice; the backend must allow it.

### 3 · Nuevo registro
- Fecha should **default to today**.
- EX / IF: show the expected format as placeholder/hint and validate inline.
- Motivo / Repartición / Pase: autocomplete from existing values.
- Mark required fields; design inline validation errors.
- An **"Editar registro"** variant isn't designed (same modal, pre-filled, with "last modified by…" info).

### 4 · Usuarios
- The **"ID" column shows a DNI** (`45.675.017`). Rename it to "DNI" — and the backend needs a `dni` field (today `id` is a UUID).
- Missing **Rol** and **Estado (activo/inactivo)** columns.
- Search placeholder is just `...` → "Buscar por DNI, usuario o nombre".
- Row actions needed: edit, activate/deactivate, **reset password**.

### 5 · Nuevo usuario
- **No role selector** — the backend requires a role.
- After confirming, a screen/modal must **show the generated temporary password once** (with a copy button and a warning that it won't be shown again). Not designed.
- Minor: the background behind this modal is the *Expedientes* table, not the Usuarios list.

---

## 7. Repository / DevOps

- No root `README` explaining what the project is or how to run it. The two packages have separate `pnpm-workspace.yaml` files; consider a single **pnpm workspace at the root** (`backend`, `frontend`, optionally `packages/shared` for DTO/zod schemas and enums).
- No `.env.example` for either app.
- `docker-compose.yml` only runs Postgres. For an on-prem deployment, add `backend` + `frontend` (nginx serving the static build and proxying `/api`) so the office runs **one command**.
- **Backups:** for a records system, document a `pg_dump` cron/backup strategy before go-live.
- No CI (lint + typecheck + tests on push).
- `backend/.agent/` and `backend/.opencode/` are AI-tool configs; fine, but they're scoped to the backend only and partially outdated.
- Commit messages are vague (`cambios varios`, `Fix several things`) — not a big deal solo, but helps later.

---

## 8. Recommended roadmap

**Phase 0 — make it run (½–1 day)**
1. Fix Prisma schema/migrations location, squash migrations, wire the seed, delete `src/database/generated`.
2. Unify roles on the Prisma enum; fix `RolesGuard`.
3. `setGlobalPrefix('api')`, `enableCors` (or Vite proxy), `@nestjs/config` with required `JWT_SECRET`.
4. Frontend: Tailwind v4 import, delete the duplicate login, send `username`, fix response types.
5. ✅ Goal: log in from the browser as superadmin.

**Phase 1 — secure the core**
6. Guard `/records`, take author from JWT, soft delete, `createdAt/updatedAt`.
7. `GET /auth/me`, change-password flow + enforcement, `isActive` check in JWT strategy, login throttling.

**Phase 2 — the actual product (match the mocks)**
8. Records: search + date filter + pagination + indexes + EX/IF validation.
9. Expedientes page, Nuevo/Editar registro modal.
10. Users: list/search/edit/deactivate/reset-password, `dni` field, role selector, temp-password display. Admin-only nav.

**Phase 3 — make it better than the spreadsheet**
11. Audit log / record history.
12. Autocomplete catalogs for Motivo/Repartición/Pase.
13. CSV/Excel export, (one-time) **import of the existing spreadsheet**.
14. Docker deployment, backups, CI, real tests.

---

## 9. Summary

- **Objective:** clear and sensible — a searchable, auditable registry of GDE expedientes for a PFA office, replacing a spreadsheet.
- **Viability:** high. Small scope, right stack, real need.
- **Current code:** an early skeleton with good intentions (DTOs, validation pipe, bcrypt, Swagger, role guard) but **not working end-to-end**, with **3 serious security holes** (open records API, client-chosen author, fallback JWT secret) and a broken role check.
- **Biggest leverage:** fix Phase 0 quickly, then focus on search/filter UX and the audit trail — those are what will make people stop using the spreadsheet.
