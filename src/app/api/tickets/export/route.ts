import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const assignedToId = searchParams.get("assignedTo") ?? undefined;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(priority ? { priority: priority as never } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { name: true, email: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    take: 10000,
  });

  const STATUS_LABELS: Record<string, string> = {
    OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
    RESOLVED: "Gelöst", CLOSED: "Geschlossen",
  };
  const PRIORITY_LABELS: Record<string, string> = {
    LOW: "Niedrig", MEDIUM: "Mittel", HIGH: "Hoch", URGENT: "Dringend",
  };

  const escape = (s: string | null | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;

  const header = ["#", "Betreff", "Status", "Priorität", "Ersteller", "E-Mail", "Zugewiesen an", "Tags", "Erstellt", "Aktualisiert"].join(";");
  const rows = tickets.map(t => [
    t.number,
    escape(t.subject),
    escape(STATUS_LABELS[t.status] ?? t.status),
    escape(PRIORITY_LABELS[t.priority] ?? t.priority),
    escape(t.name),
    escape(t.email),
    escape(t.assignedTo?.name ?? ""),
    escape(t.tags.map(tt => tt.tag.name).join(", ")),
    escape(t.createdAt.toISOString()),
    escape(t.updatedAt.toISOString()),
  ].join(";"));

  const csv = "\uFEFF" + [header, ...rows].join("\r\n"); // BOM for Excel

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
