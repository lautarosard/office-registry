# CLAUDE.md — Office Registry (PFA)

## 1. Project Overview
Internal web application for a Policía Federal Argentina (PFA) office to log and track GDE document movements (*expedientes*), replacing a shared spreadsheet.
- **Deployment target:** On-premise Linux PC (no external internet required) running via a single `docker compose up -d` command (PostgreSQL + NestJS Backend + React/Vite static build served by Nginx).
- **Package Manager:** `pnpm` (root workspace managing `backend/` and `frontend/`).

## 2. Tech Stack & Conventions
- **Backend:** NestJS (standard Express adapter), TypeScript (strict), Prisma ORM, PostgreSQL, `class-validator` + `class-transformer`, `@nestjs/jwt` + Passport, `@nestjs/throttler`, `helmet`.
- **Frontend:** React, TypeScript (strict), Vite, Tailwind CSS v4 (`@import "tailwindcss";`), TanStack Query, React Hook Form + Zod.
- **Language Policy:** Code identifiers, database fields, API routes, and technical logs in **English**; all UI labels, validation messages, and user-facing text in **Spanish (Argentina)**.

## 3. Domain & Business Rules (Source of Truth)

### 3.1 Records (`Record` / Expedientes)
Each row represents a **document movement**, NOT a unique expediente (the same `EX` can appear multiple times with different `IF` or `Pase`).
- **Fields:**
  - `date` (`Fecha`): Date received/processed (required, defaults to today in UI, displayed as `dd/mm/yyyy`).
  - `ex` (`EX`): GDE expediente number, e.g. `EX-2025-93504106- -APN-DIFP#PFA` (required, indexed, **NOT unique**, normalized uppercase/trimmed).
  - `ifCode` (`IF`): GDE informe number, e.g. `IF-2025-93911988-APN-SOPDGA#PFA` (required, indexed, normalized uppercase/trimmed).
  - `subject` (`Motivo`): Reason/subject (required, autocomplete from historical values).
  - `department` (`Repartición`): Originating/destination unit, e.g. `DGO#PFA` (required, autocomplete from historical values).
  - `forwarding` (`Pase`): Where it was forwarded (optional/nullable, displayed as `---` when empty).
- **Soft Delete & Audit:** Never hard-delete records (`deletedAt`). Every record tracks `createdById`, `updatedById`, `createdAt`, `updatedAt`, plus an immutable `AuditLog` table recording `CREATE`, `UPDATE`, and `DELETE` diffs (user, timestamp, before/after JSON).

### 3.2 Roles & Permissions
Use a single source of truth for roles (`Role` enum in Prisma: `USER`, `ADMIN`).
- **`USER`:**
  - Search, filter, and view all active office records.
  - Create new records (author `createdById` MUST be extracted from JWT `req.user.userId`, never accepted in request body).
  - Edit or soft-delete **only records created by themselves**.
- **`ADMIN`:**
  - Full read/create/edit/soft-delete access over **all** records.
  - User management: create accounts (`dni`, `username`, `fullName`, `role`), edit user details, activate/deactivate (`isActive`), and reset passwords.
  - System generates a one-time temporary password on user creation/reset; user is forced to change it (`mustChangePassword: true`) before accessing any other endpoint.
  - **Import / Export:** Only `ADMIN` can export filtered records to `.xlsx`/`.csv` and bulk-import historical spreadsheets.

## 4. Architecture & Security Mandates
- **Keep Backend Simple:** Use standard `Controller -> Service -> PrismaService` with DTOs. Remove over-engineered abstract interfaces (`IService`, `IRepository`) and dead generated code.
- **Global Prefix & Validation:** Use `app.setGlobalPrefix('api')`, `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, `helmet()`, and rate limiting on `/api/auth/login`.
- **Secrets:** Validate env vars at startup with `@nestjs/config` + Joi/Zod. Fail fast if `JWT_SECRET` is missing—never use hardcoded fallbacks.
- **Auth Enforcement:** Guard all `/api/records` and `/api/users` routes with `JwtAuthGuard`. Verify `user.isActive` in `JwtStrategy.validate()`. Block tokens with `mustChangePassword: true` from all routes except `POST /api/auth/change-password` and `GET /api/auth/me`.
- **UI Reference:** Follow `docs/mock/` (5 Figma slides: deep navy header with institutional badge, gold divider line, clean data tables, modals) while improving WCAG text contrast, adding pagination, copy-to-clipboard on `EX`/`IF`, loading/empty/error states, and role-based navigation.

## 5. Mandatory Phase Logging Protocol
Upon completing **any** implementation phase, you MUST create a detailed, self-contained Markdown log inside `docs/logs/` named `phase-XX-<slug>.md` (e.g., `docs/logs/phase-00-foundation.md`) and update `docs/logs/INDEX.md`.
Every phase log MUST include:
1. **Header:** Phase number, title, completion date, and status (`COMPLETED`).
2. **Objective & Scope:** What blockers or features were targeted.
3. **Changes Executed:** Grouped by `Database / Prisma`, `Backend`, `Frontend`, and `Infrastructure / Config`.
4. **File Manifest:** Explicit list of created, modified, and deleted files.
5. **Environment & Migration Notes:** Any new `.env` variables, Prisma migrations, or seed credentials.
6. **Verification & Test Results:** Exact commands run (`pnpm build`, migrations, curl/e2e login check) and their outcomes.
7. **Known Limitations / Next Phase Handoff:** Exact state left for the next phase.

## 6. Execution Roadmap
- **Phase 0 (`phase-00-foundation`):** Fix Prisma schema/migrations path, squash into a clean `init` migration, wire `prisma/seed.ts`, delete `backend/src/database/generated/`, unify roles (`USER`, `ADMIN`) and fix `RolesGuard`, enable `/api` prefix + CORS/Vite proxy + required `JWT_SECRET`, fix frontend Tailwind v4 import (`@import "tailwindcss";`), remove duplicate login code, align login payload (`username` + `password`), and verify end-to-end admin login.
- **Phase 1 (`phase-01-core-security`):** Guard `/api/records`, bind `createdById` from JWT, implement `GET /api/auth/me`, forced `change-password` flow, `isActive` check in JWT strategy, and login rate limiting.
- **Phase 2 (`phase-02-product-features`):** Paginated records search (`q`, `from`, `to`), ownership enforcement (`USER` vs `ADMIN`), `AuditLog`, full Users CRUD + one-time temp password modal, and UI matching `docs/mock/`.
- **Phase 3 (`phase-03-ops-and-io`):** Admin `.xlsx`/`.csv` import & export, autocomplete catalogs (`Motivo`, `Repartición`, `Pase`), unified `docker-compose.yml` (Postgres + API + Nginx frontend), root `README.md`, and automated `pg_dump` backup script.