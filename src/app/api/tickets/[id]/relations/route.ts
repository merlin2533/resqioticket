import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const createRelationSchema = z.object({
  relatedId: z.string(),
  relationType: z.enum(["linked", "merged_into", "duplicate_of", "blocks", "blocked_by"]),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const relations = await prisma.ticketRelation.findMany({
    where: { OR: [{ ticketId: id }, { relatedId: id }] },
    include: {
      ticket:   { select: { id: true, number: true, subject: true, status: true } },
      related:  { select: { id: true, number: true, subject: true, status: true } },
    },
  });
  return NextResponse.json({ data: relations });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createRelationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.relatedId === id) return NextResponse.json({ error: "Cannot relate ticket to itself" }, { status: 400 });

  // If merged_into: mark the current ticket as CLOSED
  if (parsed.data.relationType === "merged_into") {
    await prisma.ticket.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
  }

  const relation = await prisma.ticketRelation.upsert({
    where: { ticketId_relatedId_relationType: { ticketId: id, relatedId: parsed.data.relatedId, relationType: parsed.data.relationType } },
    create: { ticketId: id, relatedId: parsed.data.relatedId, relationType: parsed.data.relationType },
    update: {},
  });
  return NextResponse.json({ data: relation }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id: relationId } = await params;
  await prisma.ticketRelation.delete({ where: { id: relationId } }).catch(() => null);
  return NextResponse.json({ success: true });
}
