import { prisma } from "./prisma";
import { log } from "./logger";

interface AuditOptions {
  ticketId?: string;
  agentId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(opts: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ticketId: opts.ticketId,
        agentId: opts.agentId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        oldValue: opts.oldValue !== undefined ? (opts.oldValue as object) : undefined,
        newValue: opts.newValue !== undefined ? (opts.newValue as object) : undefined,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
      },
    });
  } catch (err) {
    log.error("Failed to write audit log", err);
  }
}
