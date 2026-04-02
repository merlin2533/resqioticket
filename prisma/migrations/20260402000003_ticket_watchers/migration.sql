CREATE TABLE "ticket_watchers" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_watchers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ticket_watchers_ticketId_agentId_key" ON "ticket_watchers"("ticketId", "agentId");
CREATE INDEX "ticket_watchers_ticketId_idx" ON "ticket_watchers"("ticketId");
ALTER TABLE "ticket_watchers" ADD CONSTRAINT "ticket_watchers_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_watchers" ADD CONSTRAINT "ticket_watchers_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
