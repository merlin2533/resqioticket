import { prisma } from "./prisma";
import { log } from "./logger";

const PRIORITY_HOURS: Record<string, string> = {
  LOW: "slaLowHours",
  MEDIUM: "slaMediumHours",
  HIGH: "slaHighHours",
  URGENT: "slaUrgentHours",
};

/** Calculate and set slaDeadline on a ticket based on priority + settings */
export async function setTicketSla(ticketId: string, priority: string): Promise<void> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings?.slaEnabled) return;

    const hoursField = PRIORITY_HOURS[priority];
    if (!hoursField) return;
    const hours = (settings as unknown as Record<string, number>)[hoursField] ?? 48;

    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { slaDeadline: deadline, slaBreached: false },
    });
  } catch (err) {
    log.error("Failed to set SLA", err);
  }
}

/** Check all open tickets for SLA breaches and mark them */
export async function checkSlaBreach(): Promise<number> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings?.slaEnabled) return 0;

    const now = new Date();
    const result = await prisma.ticket.updateMany({
      where: {
        slaDeadline: { lt: now },
        slaBreached: false,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      },
      data: { slaBreached: true },
    });
    if (result.count > 0) {
      log.warn("SLA breaches detected", { count: result.count });
    }
    return result.count;
  } catch (err) {
    log.error("Failed to check SLA breaches", err);
    return 0;
  }
}
