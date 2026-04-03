export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { KanbanClient } from "./KanbanClient";

export default async function KanbanPage() {
  const tickets = await prisma.ticket.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, number: true, subject: true, status: true, priority: true,
      type: true, name: true, assignedTo: { select: { id: true, name: true } },
      createdAt: true, updatedAt: true,
      tags: { include: { tag: true } },
    },
  });

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return <KanbanClient tickets={tickets} agents={agents} />;
}
