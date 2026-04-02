import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name:      z.string().min(1).max(100),
  label:     z.string().min(1).max(200),
  type:      z.enum(["text", "number", "boolean", "select"]),
  options:   z.array(z.string()).optional(),
  required:  z.boolean().optional().default(false),
  isActive:  z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const fields = await prisma.customField.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ data: fields });
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.customField.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "Field name already exists" }, { status: 409 });
  const field = await prisma.customField.create({ data: { ...parsed.data, options: parsed.data.options ?? undefined } });
  return NextResponse.json({ data: field }, { status: 201 });
}
