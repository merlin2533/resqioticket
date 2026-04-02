-- AlterTable Ticket: SLA fields
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "slaDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaBreached" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Settings: SLA config
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "slaEnabled"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "slaLowHours"   INTEGER NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS "slaMediumHours" INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS "slaHighHours"  INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "slaUrgentHours" INTEGER NOT NULL DEFAULT 4;

-- CreateTable custom_fields
CREATE TABLE IF NOT EXISTS "custom_fields" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "options"   JSONB,
    "required"  BOOLEAN NOT NULL DEFAULT false,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "custom_fields_name_key" ON "custom_fields"("name");

-- CreateTable ticket_custom_field_values
CREATE TABLE IF NOT EXISTS "ticket_custom_field_values" (
    "id"       TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId"  TEXT NOT NULL,
    "value"    TEXT NOT NULL,
    CONSTRAINT "ticket_custom_field_values_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_custom_field_values_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE,
    CONSTRAINT "ticket_custom_field_values_fieldId_fkey"
        FOREIGN KEY ("fieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_custom_field_values_ticketId_fieldId_key"
    ON "ticket_custom_field_values"("ticketId", "fieldId");
CREATE INDEX IF NOT EXISTS "ticket_custom_field_values_ticketId_idx"
    ON "ticket_custom_field_values"("ticketId");
