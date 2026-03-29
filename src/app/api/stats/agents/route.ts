import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          assignedTickets: true,
        },
      },
      assignedTickets: {
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
        select: { id: true },
      },
    },
  });

  const agentStats = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    totalTickets: agent._count.assignedTickets,
    activeTickets: agent.assignedTickets.length,
  }));

  return NextResponse.json({ data: agentStats });
}
