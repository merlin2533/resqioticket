import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name:        z.string().min(1).max(200),
  subject:     z.string().min(1).max(500),
  description: z.string().min(1),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
});

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const templates = await prisma.ticketTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: templates });
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const template = await prisma.ticketTemplate.create({ data: parsed.data });
  return NextResponse.json({ data: template }, { status: 201 });
}
