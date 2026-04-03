import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  agentId: z.string().min(1),
  minutes: z.number().int().min(1),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;

  const entries = await prisma.timeEntry.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "desc" },
    include: { agent: { select: { id: true, name: true } } },
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return NextResponse.json({ data: entries, totalMinutes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const entry = await prisma.timeEntry.create({
    data: { ticketId: id, ...parsed.data },
    include: { agent: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: entry }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  void params;

  const entryId = request.nextUrl.searchParams.get("entryId");
  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

  await prisma.timeEntry.delete({ where: { id: entryId } }).catch(() => {});
  return NextResponse.json({ success: true });
}
