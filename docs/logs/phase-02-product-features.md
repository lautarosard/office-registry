# Phase 02 — Product Features

| | |
|---|---|
| **Phase** | 02 (`phase-02-product-features`) |
| **Title** | Product features: records search, ownership, audit, user management and UI |
| **Completed** | 2026-11-26 |
| **Status** | `COMPLETED` |
| **Base commit** | `93a3f97` (Phase 1) |
| **Branch** | `phase-02-product-features`, merged into `main` |

---

## 1. Objective & Scope

Turn the secured skeleton into the usable product (`CLAUDE.md` §3, §6 Phase 2; `docs/REVIEW.md` §4–§6):

- Reshape `Register` into `Record`; add `dni`, `fullName`, `tokenVersion` and an immutable `AuditLog`.
- Paginated search, ownership rules, soft delete and record history.
- Users management for `ADMIN`.
- Expedientes and Usuarios screens following `docs/mock/`.
- Remove the `I*Service` / `I*Repository` layers.

Closes the two open items from Phase 1: any user could edit or delete any record (hard delete), and a password change left other sessions alive.

**Out of scope (Phase 3):** import/export, autocomplete catalogs, unified compose, README, backups.

---

## 2. Changes Executed

### Database / Prisma
- Migration `20261126040000_phase2_product_features`, **written by hand so existing rows survive** (renames and backfills, no drop/recreate):
  - `User`: `name` → `fullName`; new `dni` (unique), `tokenVersion` (default 0), `createdAt`.
  - Existing users get placeholder DNIs `00000001`, `00000002`, … (ordered by username).
  - `Register` → `Record`: `if_code`→`ifCode`, `motivo`→`subject`, `reparticion`→`department`, `pase`→`forwarding` (nullable), `dia`→`date` (`DATE`), `user_id`→`createdById`; new `updatedById`, `createdAt`, `updatedAt`, `deletedAt`. EX/IF are trimmed and upper-cased; blank forwarding becomes null.
  - `AuditLog` + enum `AuditAction`.
  - **Trigger `AuditLog_immutable`:** the database rejects `UPDATE` and `DELETE` on audit rows.
- Indexes: `Record(ex)`, `Record(ifCode)`, `Record(date, createdAt)`, `AuditLog(recordId, createdAt)`.
- Seed: `fullName`, `SEED_ADMIN_DNI` (default `00000000`, validated).

### Backend
**Architecture**
- `records` and `users` are now `Controller → Service → PrismaService` with DTOs. All `I*Service` / `I*Repository` files and the old layer folders are gone. `AuthService` and `JwtStrategy` use `PrismaService` directly.
- Shared helpers in `common/`: pagination query and envelope, input transforms, date-only validator, LIKE escaping.

**Sessions**
- JWT payload is now `{ sub, ver }`. `JwtStrategy` returns 401 unless `ver === user.tokenVersion`.
- `tokenVersion` is incremented on password change, on admin reset and on deactivation (so reactivating doesn't revive old sessions).
- The Phase 1 `mustChangePassword` token claim was removed: revocation makes it redundant.
- `GET /api/auth/me` returns `fullName` (was `name`).

**Records API**
- `GET /api/records` (`q`, `from`, `to`, `page`, `pageSize` ≤ 100) → `{ data, meta }`, active only, `date` desc then `createdAt` desc, with `createdBy` / `updatedBy`.
- `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` (204, soft), `GET /:id/audit`. `PUT` was removed.
- `date` is `YYYY-MM-DD` in and out. EX/IF are normalized.
- Ownership: `USER` only their own, `ADMIN` any → otherwise 403.
- Writes and their audit entry share one transaction. Update/delete lock the row (`SELECT … FOR UPDATE`), so concurrent edits record correct `before` values.

**Users API** (`ADMIN` only)
- `GET` (search by DNI/username/name, paginated), `POST` (12-character temporary password), `PATCH /:id`, `POST /:id/reset-password`.
- An admin cannot deactivate, demote or reset **their own** account.
- Duplicate DNI or username (case-insensitive) → 409 naming the field. Password responses are `Cache-Control: no-store`.

**Decisions taken where the spec was silent**
- EX/IF validation checks only the prefix `EX-YYYY-number-` / `IF-YYYY-number-`; the unit suffix is free.
- A `PATCH` that changes nothing writes no audit entry and does not set `updatedById`.
- Every user can read the history of active records; only `ADMIN` can read it for deleted ones.
- Resetting your own password through Users is refused (use "Cambiar contraseña"); it would sign you out before showing it.

**Bugs found by the new tests and fixed**
- Prisma does not escape `%` / `_` in `contains` or case-insensitive `equals`: searching `%` matched everything. Input is now escaped.
- Concurrent edits returned 500 (`P2028`). Cause: `DATABASE_URL` used `localhost`, which tries `::1` first while the container listens on IPv4 only, adding ~2 s to each new connection. Switched to `127.0.0.1`.

### Frontend
- Routes: `/expedientes` (default), `/usuarios` (admin only), `/login`, `/change-password`. The dashboard placeholder was removed.
- Header: navy `#1B264F`, gold divider, badge, role-based navigation, user name and role.
- Badge: `/logo-pfa.png` if present, otherwise a "PFA" monogram.
- **Expedientes:** debounced search, Desde/Hasta, clear filters, pagination, copy EX/IF, "Cargado por", history modal, edit/delete only when allowed, delete confirmation, loading/empty/error states.
- **Record modal:** date defaults to today, inline validation, upper-casing while typing; editing sends only changed fields.
- **Usuarios:** search, table with status badge, create/edit modal with role, activate/deactivate, reset with confirmation, one-time temporary password modal.
- Shared components: `Modal` (native `<dialog>`), `ConfirmDialog`, `Field` (replaces `Input`), `CopyButton`, `Pagination`, `DataTable`, `Logo`.
- On-premise adjustments:
  - Copy works over plain HTTP (fallback when `navigator.clipboard` is unavailable).
  - TanStack Query uses `networkMode: 'always'`, so requests aren't paused when the browser reports no internet.
- A 401 from a request that used a superseded token no longer clears the new one.

### Infrastructure / Config
- `.env.example`: `SEED_ADMIN_DNI`; `DATABASE_URL` uses `127.0.0.1`.
- `vitest.config.ts`: shared setup file.
- No new dependencies.

---

## 3. File Manifest

**Created**
```
backend/prisma/migrations/20261126040000_phase2_product_features/migration.sql
backend/src/common/{escape-like,pagination,transforms}.ts
backend/src/common/dto/pagination-query.dto.ts
backend/src/common/validators/is-date-only.validator.ts
backend/src/modules/records/{records.controller,records.service,records.policy,record.mapper,records.spec}.ts
backend/src/modules/records/dto/{create-record.dto,update-record.dto,search-records.query}.ts
backend/src/modules/users/{users.controller,users.service,temporary-password,temporary-password.spec}.ts
backend/src/modules/users/dto/{create-user.dto,update-user.dto}.ts
backend/test/{auth,records,users}.e2e-spec.ts
backend/test/support/fixtures.ts
frontend/src/features/records/{types,records.api,record.schema,records.test}.ts(x)
frontend/src/features/records/pages/RecordsPage.tsx
frontend/src/features/records/components/{AuditHistoryModal,DeleteRecordDialog,RecordFormModal,RecordsTable}.tsx
frontend/src/features/users/{types,users.api,user.schema,users.test}.ts(x)
frontend/src/features/users/pages/UsersPage.tsx
frontend/src/features/users/components/{TemporaryPasswordModal,UserFormModal}.tsx
frontend/src/router/AdminRoute.tsx
frontend/src/services/api-client.test.ts
frontend/src/shared/types.ts
frontend/src/shared/components/{ConfirmDialog,CopyButton,DataTable,Field,Logo,Modal,Pagination}.tsx
frontend/src/shared/utils/{api-error,clipboard,cn,format,useDebouncedValue}.ts
frontend/src/test/{app.tsx,setup.ts}
docs/logs/phase-02-product-features.md
```

**Modified**
```
backend/.env.example
backend/prisma/schema.prisma
backend/prisma/seed.ts
backend/src/app.module.ts
backend/src/common/guards/roles.guard.ts
backend/src/modules/records/records.module.ts
backend/src/modules/users/users.module.ts
backend/src/modules/auth/auth.module.ts
backend/src/modules/auth/api/controllers/auth.controller.ts
backend/src/modules/auth/application/models/responses/me.response.ts
backend/src/modules/auth/application/services/auth.service.ts
backend/src/modules/auth/application/strategies/jwt.strategy.ts
frontend/vitest.config.ts
frontend/src/index.css
frontend/src/layouts/{PrivateLayout,PublicLayout}.tsx
frontend/src/router/index.tsx
frontend/src/services/api-client.ts
frontend/src/shared/query-client.ts
frontend/src/shared/components/Button.tsx
frontend/src/features/auth/auth-flow.test.tsx
frontend/src/features/auth/pages/{ChangePasswordPage,LoginPage}.tsx
frontend/src/features/auth/types/index.ts
docs/logs/INDEX.md
```

**Deleted**
```
backend/src/modules/records/{api,application,domain,infrastructure}/**   (9 files)
backend/src/modules/users/{api,application,domain,infrastructure}/**     (9 files)
backend/test/app.e2e-spec.ts                      (split into auth/records/users)
frontend/src/features/dashboard/pages/DashboardPage.tsx
frontend/src/shared/components/Input.tsx          (replaced by Field.tsx)
```

---

## 4. Environment & Migration Notes

- **Apply:** `cd backend && pnpm db:deploy && pnpm db:generate`.
- **Local dev DB:** migrated and verified. `admin` kept its password and now has DNI `00000001` — **correct it from the Usuarios screen**. A dump taken before the migration was left in the session's temporary folder only.
- **Everyone must log in again:** old tokens have no `ver` claim.
- **`DATABASE_URL`:** use `127.0.0.1`, not `localhost`. The local `backend/.env` was updated (host only).
- **New variable:** `SEED_ADMIN_DNI` (optional, default `00000000`). It only applies when the seed creates the user.
- **Badge:** put the official image at `frontend/public/logo-pfa.png`.
- **Date inputs** follow the browser's language. Set office browsers to Spanish to get `dd/mm/aaaa` in the pickers; the table always shows `dd/mm/yyyy`.

---

## 5. Verification & Test Results

Windows 11, Node 26.10.0, `npx pnpm@10`, Postgres 16 in Docker (WSL) on port 5433.

### Static checks and tests
| Command | Result |
|---|---|
| `backend: pnpm typecheck` / `lint:check` / `build` | ✅ exit 0 |
| `backend: prettier --check` | ✅ all formatted |
| `backend: pnpm test` | ✅ 3 suites, **14 tests** |
| `backend: pnpm test:e2e` | ✅ 4 suites, **39 tests** |
| `frontend: pnpm typecheck` / `lint` / `build` | ✅ exit 0 (276 modules) |
| `frontend: pnpm test` | ✅ 5 files, **31 tests** |
| `npx prisma migrate status` | ✅ 2 migrations, schema up to date |

### Migration rehearsal
On a scratch database holding old-shape data: both migrations applied; users and the record were preserved, renamed and normalized; `prisma migrate diff` against `schema.prisma` was **empty**; `DELETE FROM "AuditLog"` was rejected.

### Live check in a real browser
Built backend + Vite + headless Edge on the `_test` database, opened as `http://intranet.test` (**not** a secure context), 1366×768. **21/21 passed:** forced change; temporary password (Escape doesn't discard it); clipboard fallback inside a modal and in the table, verified by reading the clipboard; role-based navigation and redirect; upper-casing; ownership of row actions; no horizontal scroll with short sample values; search, date filter and clear; edit and history; delete dialog focus and soft delete; own password change keeps this session and closes the other; deactivation signs the user out; no unexpected console errors. The script is not in the repo.

---

## 6. Known Limitations / Next Phase Handoff

**Behaviour to know**
- Search is case-insensitive but **accent-sensitive** ("diagramacion" does not find "Diagramación"). Fixing it needs the `unaccent` extension.
- `contains` search cannot use the B-tree indexes; with tens of thousands of rows consider `pg_trgm`.
- Deleted records cannot be restored or listed from the UI; their history is reachable only by id through the API.
- Two people editing the same field: the last save wins (both are in the history).
- User management actions (create, edit, reset, deactivate) are **not audited**; `AuditLog` covers records only.
- Table widths were checked with short sample values; very long Motivo or Pase text wraps or scrolls.

**Phase 3**
- Configure `trust proxy` behind Nginx, or the whole office shares the login rate limit (see Phase 1 log).
- Import must normalize EX/IF like `CreateRecordDto`, set `createdById`, and write `CREATE` audit entries. Check the historical spreadsheet against the EX/IF prefix rule first.
- Back up before applying migrations in production; the `AuditLog` trigger and function are part of the dump.
- Autocomplete catalogs can reuse `Record` values (`subject`, `department`, `forwarding`).
- The root pnpm workspace is still not created.
