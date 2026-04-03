import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#6366f1"),
  customerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      customer: { select: { id: true, name: true } },
      _count: { select: { tickets: true } },
    },
  });
  return NextResponse.json({ data: projects });
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const project = await prisma.project.create({ data: parsed.data });
  return NextResponse.json({ data: project }, { status: 201 });
}
