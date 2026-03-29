import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { updateTicketSchema } from "@/lib/validators";
import { sendStatusChangeEmail, sendAssignmentEmail } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ data: ticket });
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

  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  // Track status changes
  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (parsed.data.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }
    if (parsed.data.status === "CLOSED") {
      updateData.closedAt = new Date();
    }

    // Create system comment for status change
    await prisma.comment.create({
      data: {
        ticketId: id,
        authorType: "SYSTEM",
        authorName: "System",
        authorEmail: "system@resqio.ticket",
        body: `Status geaendert: ${existing.status} → ${parsed.data.status}`,
        isInternal: false,
      },
    });

    // Send status change email
    sendStatusChangeEmail({
      ticketNumber: existing.number,
      subject: existing.subject,
      externalToken: existing.externalToken,
      recipientEmail: existing.email,
      recipientName: existing.name,
      oldStatus: existing.status,
      newStatus: parsed.data.status,
    }).catch((err) => console.error("Failed to send status change email:", err));
  }

  // Handle assignment changes
  if (parsed.data.assignedToId && parsed.data.assignedToId !== existing.assignedToId) {
    const agent = await prisma.agent.findUnique({
      where: { id: parsed.data.assignedToId },
    });

    if (agent) {
      sendAssignmentEmail({
        ticketNumber: existing.number,
        subject: existing.subject,
        externalToken: existing.externalToken,
        recipientEmail: existing.email,
        recipientName: existing.name,
        agentEmail: agent.email,
        agentName: agent.name,
      }).catch((err) => console.error("Failed to send assignment email:", err));
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: ticket });
}
