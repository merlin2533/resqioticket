import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const values = await prisma.ticketCustomFieldValue.findMany({
    where: { ticketId: id },
    include: { field: true },
  });
  return NextResponse.json({ data: values });
}

const setSchema = z.object({
  fieldId: z.string(),
  value:   z.string(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const value = await prisma.ticketCustomFieldValue.upsert({
    where: { ticketId_fieldId: { ticketId: id, fieldId: parsed.data.fieldId } },
    create: { ticketId: id, fieldId: parsed.data.fieldId, value: parsed.data.value },
    update: { value: parsed.data.value },
  });
  return NextResponse.json({ data: value });
}
