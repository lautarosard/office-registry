# Phase 03 — Ops & I/O

| | |
|---|---|
| **Phase** | 03 (`phase-03-ops-and-io`) |
| **Title** | Spreadsheet import/export, autocomplete, production deployment and backups |
| **Completed** | 2026-11-26 |
| **Status** | `COMPLETED` |
| **Base commit** | `ac7ea1c` (Phase 2). Phase 3 is the commit that adds this log |

---

## 1. Objective & Scope

Complete the application and make it deployable on an on-premise Linux PC (`CLAUDE.md` §6 Phase 3):

- Real client IPs behind Nginx for the login rate limit.
- Autocomplete for Motivo, Repartición and Pase.
- Admin export and import of `.xlsx` / `.csv`.
- One production `docker compose` stack, working offline.
- Backup and restore scripts, and a root README.

---

## 2. Changes Executed

### Database / Prisma
- No schema changes and no new migration.

### Backend
**Proxy**
- `TRUST_PROXY` (`config/trust-proxy.ts`): hop count, `false`, or proxy addresses. Unset = `1` in production, `false` otherwise. `true` is rejected, since it lets clients forge their address.

**Catalogs** — `GET /api/records/catalogs` → `{ subjects, departments, forwardings }`: distinct values of active records, most used first, at most 500 each.

**Export** — `GET /api/records/export?q&from&to&format=xlsx|csv` (ADMIN): same filter and order as the list (`record.filters.ts`). Headers `Fecha, EX, IF, Motivo, Repartición, Pase, Cargado por`. XLSX has real date cells formatted `dd/mm/yyyy`. CSV is `;`-separated UTF-8 with BOM (opens correctly in Excel with Argentine settings), and cells that Excel would run as formulas are prefixed with `'`.

**Template** — `GET /api/records/import-template?format=` (ADMIN): headers only.

**Import** — `POST /api/records/import?dryRun=` (ADMIN, multipart `file`, ≤ 5 MB, ≤ 20,000 rows):
- Each row is validated as a `CreateRecordDto`, so the rules are exactly those of manual entry.
- Headers: case/accent/order tolerant; extra columns ignored. Dates: date cell, Excel serial (years 2000–2100), `dd/mm/yyyy` or ISO. Pase blank or `---` → null.
- CSV: delimiter detected (`;` `,` tab); UTF-8 or Windows-1252.
- Report `{ totalRows, validCount, invalidCount, duplicateCount, errors: [{ row, field, message }], importedCount }`; `row` is the spreadsheet row.
- Commit saves all valid rows and their `CREATE` audit entries in **one transaction**, as the importing admin. Invalid rows are skipped. Sheet order is preserved within a date.
- **Added beyond the spec:** `duplicateCount` warns about rows identical to stored records, so that re-uploading a file is noticed. It does not block.

**Other**
- `GET /api/health` (public, checks the DB) for container healthchecks.
- `app.enableShutdownHooks()` for clean stops.

### Frontend
- Record modal: native `<datalist>` suggestions on Motivo, Repartición and Pase; free text still accepted.
- ADMIN toolbar: format selector, **Exportar** (current filters), **Importar planilla**.
- Import modal: template downloads, file picker, automatic dry run, counts, error table, duplicate warning, confirmation.
- `shared/zod-config.ts`: `jitless`, because zod's `new Function` probe was reported as a CSP violation in production.

### Infrastructure / Config
- Root `docker-compose.yml` (project **`office-registry-prod`**, separate from the development DB): `db`, `backend`, `frontend`, healthchecks, `restart: unless-stopped`, log rotation. `db` and `backend` are on an `internal` network with no route out; only Nginx publishes a port.
- `backend/Dockerfile` (multi-stage, Node 22 Alpine, non-root; `prisma migrate deploy` then `node dist/main.js`; compiled seed at `seed/seed.js`).
- `frontend/Dockerfile` + `nginx/`: SPA fallback, `/api` proxy that **overwrites** `X-Forwarded-For` and `X-Real-IP`, `client_max_body_size 10m`, CSP `'self'`.
- Root `.env.example`, `.gitignore` (`.env`, `backups/`), `.gitattributes` (LF for scripts and container files, as this checkout has `core.autocrlf=true`).
- `scripts/backup-db.sh`: `pg_dump -Fc`, verified before saving, keeps the 30 newest, mode 600.
- `scripts/restore-db.sh`: validates the dump, asks for `RESTAURAR`, saves the current state, restores into a separate database and swaps only on success.
- Root `README.md` (Spanish). `backend/docker-compose.yml` is now marked development-only.

**Dependencies**
- New: `csv-parse`, `read-excel-file`, `write-excel-file`; dev `@types/multer`. `xlsx` (stale npm release with known CVEs) and `exceljs` (unmaintained) were avoided.
- `prisma` and `dotenv` moved to runtime dependencies (migrations and seed in the image).
- **Security update** (`pnpm update` within existing semver ranges, both packages): production advisories went from 31 → 2 (backend) and 46 → 0 (frontend). This fixed, among others, `proxy-addr` (critical, IP spoofing), `multer` (upload DoS) and `axios`.
- `packageManager: pnpm@10.34.9` in both packages.

---

## 3. File Manifest

**Created**
```
.env.example  .gitattributes  .gitignore  README.md  docker-compose.yml
backend/Dockerfile  backend/.dockerignore
backend/src/config/{trust-proxy,trust-proxy.spec}.ts
backend/src/health/health.controller.ts
backend/src/modules/records/{record.filters,records-io.service}.ts
backend/src/modules/records/dto/{export-records.query,import-records.query}.ts
backend/src/modules/records/io/{columns,import-rows,import-rows.spec,spreadsheet-reader,spreadsheet-writer,upload-limits}.ts
backend/test/records-io.e2e-spec.ts
frontend/Dockerfile  frontend/.dockerignore  frontend/nginx/{default,security-headers}.conf
frontend/src/features/records/components/{AdminToolbar,ImportModal}.tsx
frontend/src/features/records/{io-and-catalogs.test.tsx,records.api.test.ts}
frontend/src/shared/utils/save-file.ts  frontend/src/shared/zod-config.ts
scripts/{backup-db,restore-db}.sh
docs/logs/phase-03-ops-and-io.md
```

**Modified**
```
backend/.env.example  backend/docker-compose.yml  backend/package.json  backend/pnpm-lock.yaml
backend/src/{app.module,app.setup,main}.ts
backend/src/config/env.validation.ts
backend/src/modules/records/{records.controller,records.module,records.service}.ts
backend/test/hardening.e2e-spec.ts
frontend/package.json  frontend/pnpm-lock.yaml
frontend/src/main.tsx
frontend/src/shared/utils/api-error.ts
frontend/src/features/records/{records.api,records.test,types}.ts(x)
frontend/src/features/records/components/RecordFormModal.tsx
frontend/src/features/records/pages/RecordsPage.tsx
docs/logs/INDEX.md
```

**Deleted:** none.

---

## 4. Environment & Migration Notes

- **Production `.env`** (repository root): required `POSTGRES_PASSWORD` (letters and digits only; it goes inside a URL) and `JWT_SECRET` (≥ 32). Optional: `HTTP_PORT`, `HTTP_BIND`, `POSTGRES_USER`, `POSTGRES_DB`, `JWT_EXPIRES_IN` (compose default `8h`), `LOGIN_THROTTLE_*`, `TZ`.
- **Development:** optional `TRUST_PROXY`. Run `pnpm install` and `pnpm db:generate` (Prisma 6.19.3).
- **Migrations:** none new. The container applies pending ones on start.
- **Seed in production:** `docker compose exec -e SEED_ADMIN_PASSWORD … backend node seed/seed.js` (see README). It is deliberately not automatic: it would recreate `admin` if that account were renamed.

---

## 5. Verification & Test Results

Windows 11, Node 26.10.0, `npx pnpm@10`, Postgres 16; Docker 29.8.1 / Compose 5.5.1 in WSL (Debian).

### Static checks and tests
| Command | Result |
|---|---|
| `backend: pnpm typecheck` / `lint:check` / `build` | ✅ exit 0 |
| `backend: prettier --check` | ✅ all formatted |
| `backend: pnpm test` | ✅ 5 suites, **34 tests** |
| `backend: pnpm test:e2e` | ✅ 5 suites, **57 tests** |
| `frontend: pnpm typecheck` / `lint` / `build` | ✅ exit 0 (288 modules; Vite warns the bundle is > 500 kB) |
| `frontend: pnpm test` | ✅ 7 files, **41 tests** |
| `pnpm install --frozen-lockfile` (both) | ✅ |
| `pnpm audit --prod` | frontend ✅ none; backend 2 high, see §6 |

New e2e coverage: catalogs; export role check, filters, XLSX content, CSV bytes and formula escaping; export→import round trip in both formats; import role check, dry run, row errors, audit entries, XLSX date cells, duplicates, 2,500 rows, bad/oversized files; per-client throttling behind a proxy; healthcheck.

### Production containers
`docker compose config` ✅ (and fails fast without secrets). Both images built. Run as the separate project `office-registry-smoke`, port 8088, throwaway secrets, then removed.

- **Stack (12/12):** healthy; both migrations applied; SPA fallback; CSP and helmet headers; Swagger 404; no external URLs; seed command (and idempotent); API flow; 7 MB upload → Spanish 413; no default route in `db` or `backend`; backend not published.
- **Rate limit behind Nginx:** one client → five 401 then 429; the same client forging `X-Forwarded-For` → 429; a second client → 401.
- **Persistence:** data survived `down` / `up`; backend stops in about a second.
- **Backup/restore (14/14):** rotation; run from another directory; `BACKUP_KEEP=0` refused; wrong confirmation, non-dump and truncated dump leave the data untouched; restore returns the data, the audit trigger and the migration table; safety copy kept.
- **Browser (9/9)**, headless Edge over plain HTTP: login, deep link, suggestions, template download, Windows-1252 import with preview, filtered CSV export, no outside requests, no console errors.

**Build workaround on this machine only:** the WSL Docker daemon's `docker0` bridge is missing, so images were built with `network: host` through a temporary override file. The committed compose file has no such setting. Restarting Docker would probably restore it.

**Not verified:** a native Linux server; reboot behaviour; real LAN clients (client IPs were two containers); the offline `docker save` / `load` transfer; the cron line itself.

---

## 6. Known Limitations / Handoff

**Before going live**
- 🔴 **HTTP only:** passwords and data cross the LAN unencrypted. Add TLS in Nginx if the network isn't trusted.
- **Test the import with the real historical spreadsheet** (dry run). EX/IF must start with `EX-year-number-` / `IF-year-number-`, and column names must be the six listed in the README. This has only been tested with made-up data.
- **Create a second administrator:** a lone admin who forgets the password cannot be recovered from the app.
- **Copy backups off the machine.** They are not encrypted.
- On native Linux, confirm that two PCs get separate rate limits (userland proxy or IPv6 setups can hide client addresses).

**Open items**
- Backend audit: `effect` and `deepmerge-ts`, both inside the Prisma CLI's config loader. They run only `migrate deploy` at startup and never see requests; fixing needs a Prisma major upgrade.
- Import reads the whole file in memory. The 5 MB limit applies to the compressed size; only administrators can upload.
- Export loads all matching rows before writing.
- The root pnpm workspace of `CLAUDE.md` §1 was not created; `backend/` and `frontend/` keep separate lockfiles.
- The template READMEs in `backend/` and `frontend/` are still there.
- No CI.
- The PFA badge file is still missing (`frontend/public/logo-pfa.png`).
- From earlier phases: accent-sensitive search; user-management actions are not audited; deleted records can't be restored from the UI.
