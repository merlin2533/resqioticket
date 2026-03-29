import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name:     z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  conditions: z.object({ items: z.array(z.any()), logic: z.enum(["AND", "OR"]) }).optional(),
  actions:  z.array(z.any()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const rule = await prisma.automationRule.update({ where: { id }, data: parsed.data as object }).catch(() => null);
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rule });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  await prisma.automationRule.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
