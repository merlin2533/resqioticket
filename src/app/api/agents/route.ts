import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { createAgentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const agents = await prisma.agent.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assignedTickets: true } },
    },
  });

  return NextResponse.json({ data: agents });
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

  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.agent.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An agent with this email already exists" },
      { status: 409 }
    );
  }

  const agent = await prisma.agent.create({
    data: parsed.data,
  });

  return NextResponse.json({ data: agent }, { status: 201 });
}
