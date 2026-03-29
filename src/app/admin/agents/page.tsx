export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { AgentsClient } from "./AgentsClient";

export default async function AdminAgentsPage() {
  const agents = await prisma.agent.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignedTickets: true } } },
  });
  return <AgentsClient agents={agents} />;
}
