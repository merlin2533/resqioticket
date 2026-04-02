-- AlterTable Agent: add password + notification preferences
ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "password"             TEXT,
  ADD COLUMN IF NOT EXISTS "notifyOnNewTicket"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyOnComment"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Customer: add notification preferences
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "notifyOnComment"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Settings: add Slack/Teams webhook URLs
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "slackWebhookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "teamsWebhookUrl" TEXT;
