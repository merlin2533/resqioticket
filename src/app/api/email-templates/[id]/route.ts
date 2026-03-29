import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name:     z.string().min(1).max(200).optional(),
  subject:  z.string().min(1).max(500).optional(),
  htmlBody: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const t = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: t });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const t = await prisma.emailTemplate.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: t });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  // Reset to default instead of deleting
  await prisma.emailTemplate.update({ where: { id }, data: { isActive: false } }).catch(() => null);
  return NextResponse.json({ success: true });
}
