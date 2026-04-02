import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { updateAgentSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/customer-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      assignedTickets: {
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { assignedTickets: true } },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({ data: agent });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.agent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.password) {
    updateData.password = await hashPassword(parsed.data.password);
  } else {
    delete updateData.password; // don't update password if not provided
  }

  const agent = await prisma.agent.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ data: agent });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  const existing = await prisma.agent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Soft-delete: deactivate instead of removing
  const agent = await prisma.agent.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ data: agent });
}
