export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TicketDetailClient } from "./TicketDetailClient";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ticket, tags, agents] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, email: true } } } },
        tags: { include: { tag: true } },
        attachments: { orderBy: { createdAt: "desc" } },
        sourceRelations: { include: { related: { select: { id: true, number: true, subject: true, status: true } } } },
        targetRelations: { include: { ticket: { select: { id: true, number: true, subject: true, status: true } } } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!ticket) notFound();

  return <TicketDetailClient ticket={ticket} allTags={tags} agents={agents} />;
}
