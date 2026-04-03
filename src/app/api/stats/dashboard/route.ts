import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    statusCounts,
    typeCounts,
    todayCreated,
    todayResolved,
    slaStats,
    recentTickets,
    agentStats,
  ] = await Promise.all([
    // Status breakdown
    prisma.ticket.groupBy({ by: ["status"], _count: true }),
    // Type breakdown
    prisma.ticket.groupBy({ by: ["type"], _count: true }),
    // Today's new tickets
    prisma.ticket.count({ where: { createdAt: { gte: today } } }),
    // Today's resolved
    prisma.ticket.count({ where: { resolvedAt: { gte: today } } }),
    // SLA stats
    Promise.all([
      prisma.ticket.count({ where: { slaBreached: true, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.ticket.count({ where: { slaDeadline: { not: null }, createdAt: { gte: thirtyDaysAgo } } }),
    ]),
    // Recent tickets
    prisma.ticket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, number: true, subject: true, status: true, priority: true, type: true, updatedAt: true, assignedTo: { select: { name: true } } },
    }),
    // Agent performance (last 30 days)
    prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: { assignedToId: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    }),
  ]);

  // Calculate avg response time (first comment after creation)
  const ticketsWithFirstComment = await prisma.ticket.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      createdAt: true,
      comments: {
        where: { authorType: "AGENT" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  let totalResponseMs = 0;
  let responseCount = 0;
  for (const t of ticketsWithFirstComment) {
    if (t.comments.length > 0) {
      totalResponseMs += new Date(t.comments[0].createdAt).getTime() - new Date(t.createdAt).getTime();
      responseCount++;
    }
  }
  const avgResponseMinutes = responseCount > 0 ? Math.round(totalResponseMs / responseCount / 60000) : 0;

  // First contact resolution
  const resolvedTickets = await prisma.ticket.findMany({
    where: { status: { in: ["RESOLVED", "CLOSED"] }, createdAt: { gte: thirtyDaysAgo } },
    select: { _count: { select: { comments: { where: { authorType: "AGENT" } } } } },
  });
  const fcrCount = resolvedTickets.filter(t => (t._count as { comments: number }).comments <= 1).length;
  const fcrRate = resolvedTickets.length > 0 ? Math.round((fcrCount / resolvedTickets.length) * 100) : 0;

  // Get agent names
  const agentIds = agentStats.map(a => a.assignedToId).filter(Boolean) as string[];
  const agentNames = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const agentMap = Object.fromEntries(agentNames.map(a => [a.id, a.name]));

  const [slaBreached, slaTotal] = slaStats;
  const slaCompliance = slaTotal > 0 ? Math.round(((slaTotal - slaBreached) / slaTotal) * 100) : 100;

  return NextResponse.json({
    statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
    typeCounts: Object.fromEntries(typeCounts.map(t => [t.type, t._count])),
    todayCreated,
    todayResolved,
    avgResponseMinutes,
    fcrRate,
    slaCompliance,
    recentTickets,
    agentPerformance: agentStats.map(a => ({
      agentId: a.assignedToId,
      name: agentMap[a.assignedToId!] ?? "Unbekannt",
      ticketCount: a._count,
    })),
  });
}
