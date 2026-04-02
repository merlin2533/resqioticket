import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { updateTicketSchema } from "@/lib/validators";
import { sendStatusChangeEmail, sendAssignmentEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { runAutomations } from "@/lib/automations";
import { fireWebhooks } from "@/lib/webhooks";
import { emitTicketEvent } from "@/lib/sse-events";

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

    // Check customer preference for status change email
    let sendStatusEmail = true;
    if (existing.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: existing.customerId },
        select: { notifyOnStatusChange: true },
      });
      sendStatusEmail = customer?.notifyOnStatusChange ?? true;
    }
    if (sendStatusEmail) {
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

    // Fire webhooks for status change
    const oldStatus = existing.status;
    const newStatus = parsed.data.status!;
    prisma.settings.findUnique({ where: { id: "default" } }).then(settings => {
      if (settings) {
        fireWebhooks(settings, "status_changed", {
          ticketNumber: existing.number,
          subject: existing.subject,
          externalToken: existing.externalToken,
          priority: existing.priority,
          status: newStatus,
          customerName: existing.name,
          customerEmail: existing.email,
        }, { oldStatus, newStatus });
      }
    }).catch(() => {});
  }

  // Handle assignment changes
  if (parsed.data.assignedToId && parsed.data.assignedToId !== existing.assignedToId) {
    const agent = await prisma.agent.findUnique({
      where: { id: parsed.data.assignedToId },
    });

    if (agent && agent.notifyOnNewTicket) {
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

  // Audit log
  createAuditLog({ ticketId: id, action: "ticket_updated", entityType: "ticket", entityId: id, oldValue: { status: existing.status, priority: existing.priority }, newValue: parsed.data }).catch(() => {});

  // Run automations
  runAutomations("ticket_updated", { id: ticket.id, subject: ticket.subject, description: ticket.description, email: ticket.email, name: ticket.name, priority: ticket.priority, status: ticket.status }).catch(() => {});

  if (parsed.data.status && parsed.data.status !== existing.status) {
    emitTicketEvent({
      type: "ticket_updated",
      ticketId: id,
      ticketNumber: existing.number,
      subject: existing.subject,
      message: `Status: ${existing.status} → ${parsed.data.status}`,
      agentId: ticket.assignedTo?.id ?? undefined,
    });
  }

  return NextResponse.json({ data: ticket });
}
