import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validators";
import { sendNewCommentEmail, sendAgentNotifyEmail, sendCentralNotifyEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { runAutomations } from "@/lib/automations";
import { fireWebhooks } from "@/lib/webhooks";
import { emitTicketEvent } from "@/lib/sse-events";
import { z } from "zod";

const commentWithNotifySchema = createCommentSchema.extend({
  notifyCreator: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          notifyOnComment: true,
        },
      },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = commentWithNotifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { ticketId: id, ...parsed.data },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  // Bump ticket updatedAt
  await prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } });

  // Audit
  createAuditLog({ ticketId: id, action: "comment_added", entityType: "comment", entityId: comment.id, newValue: { authorType: parsed.data.authorType, isInternal: parsed.data.isInternal } }).catch(() => {});

  // Automation trigger
  runAutomations("comment_added", { id: ticket.id, subject: ticket.subject, description: ticket.description, email: ticket.email, name: ticket.name, priority: ticket.priority, status: ticket.status }).catch(() => {});

  if (!parsed.data.isInternal) {
    emitTicketEvent({
      type: "comment_added",
      ticketId: id,
      ticketNumber: ticket.number,
      subject: ticket.subject,
      message: `${parsed.data.authorName}: ${parsed.data.body.replace(/<[^>]+>/g, "").slice(0, 80)}`,
      agentId: ticket.assignedToId ?? undefined,
    });
  }

  // Load global settings once
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const notifyCreatorDefault = settings?.notifyCreatorOnComment ?? true;
  const notifyAgentDefault   = settings?.notifyAgentOnComment   ?? true;
  const centralEmail         = settings?.centralNotifyEmail;

  const isPublicComment = !parsed.data.isInternal;

  // ── 1. Notify CREATOR (customer) when agent comments ────────────────────
  if (isPublicComment && parsed.data.authorType === "AGENT") {
    const shouldNotifyGlobal = parsed.data.notifyCreator ?? notifyCreatorDefault;
    if (shouldNotifyGlobal) {
      // Check customer preference if customer is linked
      let customerWantsEmail = true;
      if (ticket.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: ticket.customerId },
          select: { notifyOnComment: true },
        });
        customerWantsEmail = customer?.notifyOnComment ?? true;
      }
      if (customerWantsEmail) {
        sendNewCommentEmail({
          ticketNumber:  ticket.number,
          subject:       ticket.subject,
          externalToken: ticket.externalToken,
          recipientEmail: ticket.email,
          recipientName:  ticket.name,
          commentBody:   parsed.data.body,
          commentAuthor: parsed.data.authorName,
        }).catch((err) => console.error("sendNewCommentEmail failed:", err));
      }
    }
  }

  // ── 2. Notify ASSIGNED AGENT when customer/system comments ──────────────
  if (isPublicComment && parsed.data.authorType !== "AGENT" && notifyAgentDefault) {
    if (ticket.assignedTo?.isActive && ticket.assignedTo.notifyOnComment) {
      sendAgentNotifyEmail({
        ticketNumber:  ticket.number,
        subject:       ticket.subject,
        externalToken: ticket.externalToken,
        agentEmail:    ticket.assignedTo.email,
        agentName:     ticket.assignedTo.name,
        commentAuthor: parsed.data.authorName,
        commentBody:   parsed.data.body,
        customerEmail: ticket.email,
      }).catch((err) => console.error("sendAgentNotifyEmail failed:", err));
    }
  }

  // ── 3. Central notification on ALL public comments ───────────────────────
  if (isPublicComment && centralEmail) {
    const eventLabel = parsed.data.authorType === "AGENT" ? "Agent-Antwort" : "Kunden-Nachricht";
    sendCentralNotifyEmail({
      ticketNumber:  ticket.number,
      subject:       ticket.subject,
      externalToken: ticket.externalToken,
      centralEmail,
      eventLabel,
      commentAuthor: parsed.data.authorName,
      commentBody:   parsed.data.body,
      customerEmail: ticket.email,
      agentName:     ticket.assignedTo?.name ?? "–",
    }).catch((err) => console.error("sendCentralNotifyEmail failed:", err));
  }

  // Fire webhooks for new public comment
  if (isPublicComment) {
    prisma.settings.findUnique({ where: { id: "default" } }).then(settings => {
      if (settings) {
        fireWebhooks(settings, "comment_added", {
          ticketNumber: ticket.number,
          subject: ticket.subject,
          externalToken: ticket.externalToken,
          priority: ticket.priority,
          status: ticket.status,
          customerName: ticket.name,
          customerEmail: ticket.email,
          agentName: ticket.assignedTo?.name,
        }, { commentAuthor: parsed.data.authorName });
      }
    }).catch(() => {});
  }

  return NextResponse.json({ data: comment }, { status: 201 });
}
