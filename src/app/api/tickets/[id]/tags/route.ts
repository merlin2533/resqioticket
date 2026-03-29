import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const tagBodySchema = z.object({ tagId: z.string() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = tagBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  await prisma.ticketTag.upsert({
    where: { ticketId_tagId: { ticketId: id, tagId: parsed.data.tagId } },
    create: { ticketId: id, tagId: parsed.data.tagId },
    update: {},
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const tagId = searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });
  await prisma.ticketTag.delete({ where: { ticketId_tagId: { ticketId: id, tagId } } }).catch(() => null);
  return NextResponse.json({ success: true });
}
