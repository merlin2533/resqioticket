import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  label:     z.string().min(1).max(200).optional(),
  type:      z.enum(["text", "number", "boolean", "select"]).optional(),
  options:   z.array(z.string()).nullable().optional(),
  required:  z.boolean().optional(),
  isActive:  z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const { options: rawOptions, ...rest } = parsed.data;
  const updateData: Parameters<typeof prisma.customField.update>[0]["data"] = {
    ...rest,
    ...(rawOptions !== undefined && {
      options: rawOptions === null ? Prisma.JsonNull : rawOptions,
    }),
  };
  const field = await prisma.customField.update({ where: { id }, data: updateData });
  return NextResponse.json({ data: field });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  await prisma.customField.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
