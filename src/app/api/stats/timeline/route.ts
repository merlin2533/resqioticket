import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [createdTickets, resolvedTickets] = await Promise.all([
    prisma.ticket.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ticket.findMany({
      where: { resolvedAt: { gte: since } },
      select: { resolvedAt: true },
      orderBy: { resolvedAt: "asc" },
    }),
  ]);

  // Group by day
  const createdByDay: Record<string, number> = {};
  const resolvedByDay: Record<string, number> = {};

  for (const t of createdTickets) {
    const day = t.createdAt.toISOString().split("T")[0];
    createdByDay[day] = (createdByDay[day] || 0) + 1;
  }

  for (const t of resolvedTickets) {
    if (t.resolvedAt) {
      const day = t.resolvedAt.toISOString().split("T")[0];
      resolvedByDay[day] = (resolvedByDay[day] || 0) + 1;
    }
  }

  // Build timeline array
  const timeline = [];
  const current = new Date(since);
  const today = new Date();

  while (current <= today) {
    const day = current.toISOString().split("T")[0];
    timeline.push({
      date: day,
      created: createdByDay[day] || 0,
      resolved: resolvedByDay[day] || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({ data: timeline });
}
