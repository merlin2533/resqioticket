export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { TicketListClient } from "./TicketListClient";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string; page?: string; tag?: string; project?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 25;

  const hdrs = await headers();
  const agentId = hdrs.get("x-agent-id");
  const agentRole = hdrs.get("x-agent-role");
  // AGENT role: only show tickets assigned to them
  const agentAssignedFilter = agentId && agentRole === "AGENT" ? { assignedToId: agentId } : {};

  const where = {
    ...agentAssignedFilter,
    ...(sp.status ? { status: sp.status as never } : { status: { not: "ARCHIVED" as never } }),
    ...(sp.priority ? { priority: sp.priority as never } : {}),
    ...(sp.tag      ? { tags: { some: { tag: { name: sp.tag } } } } : {}),
    ...(sp.project  ? { projectId: sp.project } : {}),
    ...(sp.q        ? { OR: [
      { subject:     { contains: sp.q, mode: "insensitive" as const } },
      { description: { contains: sp.q, mode: "insensitive" as const } },
      { email:       { contains: sp.q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [tickets, total, tags, agents, projects] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTo: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    }),
    prisma.ticket.count({ where }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.agent.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <TicketListClient
      tickets={tickets}
      total={total}
      page={page}
      pageSize={pageSize}
      tags={tags}
      agents={agents}
      projects={projects}
      filters={{ status: sp.status, priority: sp.priority, q: sp.q, tag: sp.tag, project: sp.project }}
    />
  );
}
