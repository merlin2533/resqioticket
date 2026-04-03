import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customers: {
        select: { customerId: true },
      },
      _count: {
        select: {
          customers: true,
          tickets: true,
        },
      },
    },
  });

  return NextResponse.json({ data: projects });
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: parsed.data,
    include: {
      _count: {
        select: {
          customers: true,
          tickets: true,
        },
      },
    },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
