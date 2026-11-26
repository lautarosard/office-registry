-- Phase 2: User gains dni/fullName/tokenVersion, Register becomes Record,
-- and an append-only AuditLog is added. Written by hand so that existing rows
-- are renamed and backfilled instead of dropped.

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- User
ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";
ALTER TABLE "User"
  ADD COLUMN "dni" TEXT,
  ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing accounts get a placeholder DNI (00000001, 00000002, ...) that an
-- administrator must correct from the Usuarios screen.
UPDATE "User" AS u
SET "dni" = lpad(n.position::text, 8, '0')
FROM (
  SELECT "id", row_number() OVER (ORDER BY "username") AS position FROM "User"
) AS n
WHERE n."id" = u."id";

ALTER TABLE "User" ALTER COLUMN "dni" SET NOT NULL;
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- Register -> Record
ALTER TABLE "Register" RENAME TO "Record";
ALTER TABLE "Record" RENAME CONSTRAINT "Register_pkey" TO "Record_pkey";
ALTER TABLE "Record" RENAME CONSTRAINT "Register_user_id_fkey" TO "Record_createdById_fkey";
ALTER TABLE "Record" RENAME COLUMN "if_code" TO "ifCode";
ALTER TABLE "Record" RENAME COLUMN "motivo" TO "subject";
ALTER TABLE "Record" RENAME COLUMN "reparticion" TO "department";
ALTER TABLE "Record" RENAME COLUMN "pase" TO "forwarding";
ALTER TABLE "Record" RENAME COLUMN "dia" TO "date";
ALTER TABLE "Record" RENAME COLUMN "user_id" TO "createdById";

ALTER TABLE "Record"
  ALTER COLUMN "date" SET DATA TYPE DATE,
  ALTER COLUMN "forwarding" DROP NOT NULL,
  ADD COLUMN "updatedById" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Record" ALTER COLUMN "updatedAt" DROP DEFAULT;

UPDATE "Record"
SET "ex" = upper(btrim("ex")),
    "ifCode" = upper(btrim("ifCode")),
    "forwarding" = nullif(btrim("forwarding"), '');

-- AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "performedById" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Record_ex_idx" ON "Record"("ex");
CREATE INDEX "Record_ifCode_idx" ON "Record"("ifCode");
CREATE INDEX "Record_date_createdAt_idx" ON "Record"("date", "createdAt");
CREATE INDEX "AuditLog_recordId_createdAt_idx" ON "AuditLog"("recordId", "createdAt");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AuditLog is immutable: reject any change to existing entries.
CREATE FUNCTION "audit_log_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_immutable"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_immutable"();
