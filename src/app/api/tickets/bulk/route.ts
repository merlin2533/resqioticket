import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { log } from "@/lib/logger";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["set_status", "set_priority", "assign", "add_tag", "delete"]),
  value: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const { ids, action, value } = parsed.data;
  let count = 0;

  switch (action) {
    case "set_status":
      if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });
      await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { status: value as never } });
      count = ids.length;
      break;

    case "set_priority":
      if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });
      await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { priority: value as never } });
      count = ids.length;
      break;

    case "assign":
      await prisma.ticket.updateMany({
        where: { id: { in: ids } },
        data: { assignedToId: value || null },
      });
      count = ids.length;
      break;

    case "add_tag": {
      if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });
      const tag = await prisma.tag.findFirst({ where: { name: value } });
      if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      await prisma.ticketTag.createMany({
        data: ids.map(ticketId => ({ ticketId, tagId: tag.id })),
        skipDuplicates: true,
      });
      count = ids.length;
      break;
    }

    case "delete": {
      const toDelete = await prisma.ticket.findMany({
        where: { id: { in: ids } },
        select: { id: true, number: true, subject: true },
      });
      log.warn("Bulk delete tickets", { count: toDelete.length, tickets: toDelete.map(t => ({ id: t.id, number: t.number, subject: t.subject })) });
      await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
      count = toDelete.length;
      break;
    }
  }

  // Audit log for bulk action
  createAuditLog({
    action: `bulk_${action}`,
    entityType: "ticket",
    entityId: ids.join(","),
    newValue: { ids, action, value, count },
  }).catch(() => {});

  return NextResponse.json({ ok: true, count });
}
