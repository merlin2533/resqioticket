import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const tag = await prisma.tag.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  return NextResponse.json({ data: tag });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  await prisma.tag.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
