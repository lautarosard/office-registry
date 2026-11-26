# Phase Logs — Index

Implementation log for Office Registry, following the protocol in `CLAUDE.md` §5. Each phase has a self-contained log with its scope, file manifest, env/migration notes, verification results and handoff.

| Phase | Log | Completed | Status | Summary |
|---|---|---|---|---|
| 00 | [Foundation](phase-00-foundation.md) | 2026-11-26 | `COMPLETED` | Prisma schema/migrations at the default path with one clean `init` migration and an env-driven ADMIN seed; roles unified on Prisma `Role { USER, ADMIN }` (RolesGuard fixed); `@nestjs/config` + Joi fail-fast on `JWT_SECRET`; `/api` prefix, CORS and Vite proxy; Tailwind v4; duplicate login removed; `{ username, password }` login verified end-to-end. |
| 01 | [Core security](phase-01-core-security.md) | 2026-11-26 | `COMPLETED` | Global JWT guard (all `/api/records` protected, author bound from the token); `GET /api/auth/me`; forced change-password flow (API and UI); immediate revocation of inactive users; helmet, login throttling, Swagger off in production, Prisma error mapping; real e2e and frontend tests. |
| 02 | [Product features](phase-02-product-features.md) | 2026-11-26 | `COMPLETED` | `Record` reshape with data-preserving migration and immutable `AuditLog`; paginated search, ownership rules and soft delete; Users management with temporary passwords; `tokenVersion` session revocation; Expedientes and Usuarios screens; `I*` layers removed. |
| 03 | [Ops & I/O](phase-03-ops-and-io.md) | 2026-11-26 | `COMPLETED` | Admin xlsx/csv export and import with dry run; autocomplete catalogs; trust-proxy for per-client rate limiting; production `docker compose` (Postgres + API + Nginx, offline); backup and restore scripts; root README; dependency security update. |

Background: [`docs/REVIEW.md`](../REVIEW.md) (initial project review).
