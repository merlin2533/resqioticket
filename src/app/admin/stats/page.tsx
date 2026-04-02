export const dynamic = "force-dynamic";
import { headers } from "next/headers";
import { StatsChartsClient } from "./StatsChartsClient";
import { prisma } from "@/lib/prisma";

export default async function AdminStatsPage() {
  const hdrs = await headers();
  const agentRole = hdrs.get("x-agent-role");
  const agentId = hdrs.get("x-agent-id");

  // Fetch data server-side
  const agentFilter = agentId && agentRole === "AGENT" ? { assignedToId: agentId } : {};

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [statusCounts, priorityCounts, agentStats, timeline] = await Promise.all([
    Promise.all([
      prisma.ticket.count({ where: { ...agentFilter, status: "OPEN" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "WAITING" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "RESOLVED" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "CLOSED" } }),
    ]),
    Promise.all([
      prisma.ticket.count({ where: { ...agentFilter, priority: "LOW" } }),
      prisma.ticket.count({ where: { ...agentFilter, priority: "MEDIUM" } }),
      prisma.ticket.count({ where: { ...agentFilter, priority: "HIGH" } }),
      prisma.ticket.count({ where: { ...agentFilter, priority: "URGENT" } }),
    ]),
    agentId ? Promise.resolve([]) : prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true,
        _count: { select: { assignedTickets: true } },
        assignedTickets: {
          where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
          select: { id: true },
        },
      },
    }),
    prisma.ticket.findMany({
      where: { ...agentFilter, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const [open, inProgress, waiting, resolved, closed] = statusCounts;
  const [low, medium, high, urgent] = priorityCounts;

  // Build 30-day timeline
  const createdByDay: Record<string, number> = {};
  for (const t of timeline) {
    const day = t.createdAt.toISOString().split("T")[0];
    createdByDay[day] = (createdByDay[day] || 0) + 1;
  }
  const days30: { date: string; created: number }[] = [];
  const cur = new Date(since);
  const today = new Date();
  while (cur <= today) {
    const d = cur.toISOString().split("T")[0];
    days30.push({ date: d, created: createdByDay[d] || 0 });
    cur.setDate(cur.getDate() + 1);
  }

  return (
    <StatsChartsClient
      statusData={{ open, inProgress, waiting, resolved, closed }}
      priorityData={{ low, medium, high, urgent }}
      agentStats={agentStats.map(a => ({ id: a.id, name: a.name, totalTickets: a._count.assignedTickets, activeTickets: a.assignedTickets.length }))}
      timeline={days30}
    />
  );
}
