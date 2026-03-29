import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const ticketId  = searchParams.get("ticketId") ?? undefined;
  const agentId   = searchParams.get("agentId") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize  = Math.min(100, parseInt(searchParams.get("pageSize") ?? "50", 10));

  const where = {
    ...(ticketId   ? { ticketId }   : {}),
    ...(agentId    ? { agentId }    : {}),
    ...(entityType ? { entityType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        ticket: { select: { number: true, subject: true } },
        agent:  { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
