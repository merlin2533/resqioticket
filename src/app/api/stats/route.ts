import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    waitingTickets,
    resolvedTickets,
    closedTickets,
    urgentTickets,
    unassignedTickets,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "WAITING" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED" } }),
    prisma.ticket.count({ where: { priority: "URGENT", status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.ticket.count({ where: { assignedToId: null, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  return NextResponse.json({
    data: {
      total: totalTickets,
      byStatus: {
        open: openTickets,
        inProgress: inProgressTickets,
        waiting: waitingTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
      },
      urgent: urgentTickets,
      unassigned: unassignedTickets,
    },
  });
}
