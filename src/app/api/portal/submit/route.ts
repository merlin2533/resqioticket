import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { z } from "zod";
import { sendTicketCreatedEmail } from "@/lib/email";
import { runAutomations } from "@/lib/automations";
import { emitTicketEvent } from "@/lib/sse-events";
import { fireWebhooks } from "@/lib/webhooks";
import { createAuditLog } from "@/lib/audit";
import { setTicketSla } from "@/lib/sla";
import { log } from "@/lib/logger";
import { detectPriority } from "@/lib/auto-priority";

const schema = z.object({
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  type: z.enum(["INCIDENT", "SERVICE_REQUEST", "CHANGE_REQUEST", "PROBLEM"]).optional().default("INCIDENT"),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  // Auto-detect priority if not explicitly set (default is MEDIUM)
  const data = { ...parsed.data };
  if (data.priority === "MEDIUM") {
    const detected = detectPriority(data.subject, data.description);
    if (detected) data.priority = detected;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      type: data.type,
      email: customer.email,
      name: customer.name,
      customerId: customer.id,
      ...(data.projectId ? { projectId: data.projectId } : {}),
    },
  });

  createAuditLog({ ticketId: ticket.id, action: "ticket_created", entityType: "ticket", entityId: ticket.id, newValue: { number: ticket.number, subject: ticket.subject } }).catch(() => {});

  setTicketSla(ticket.id, ticket.priority).catch(() => {});

  runAutomations("ticket_created", { id: ticket.id, subject: ticket.subject, description: ticket.description, email: ticket.email, name: ticket.name, priority: ticket.priority, status: ticket.status }).catch(() => {});

  sendTicketCreatedEmail({
    ticketNumber: ticket.number,
    subject: ticket.subject,
    externalToken: ticket.externalToken,
    recipientEmail: ticket.email,
    recipientName: ticket.name,
  }).catch((err) => log.error("Failed to send ticket created email", err));

  emitTicketEvent({
    type: "ticket_created",
    ticketId: ticket.id,
    ticketNumber: ticket.number,
    subject: ticket.subject,
    message: `Von ${ticket.name} (${ticket.email})`,
  });

  prisma.settings.findUnique({ where: { id: "default" } }).then(settings => {
    if (settings) {
      fireWebhooks(settings, "ticket_created", {
        ticketNumber: ticket.number,
        subject: ticket.subject,
        externalToken: ticket.externalToken,
        priority: ticket.priority,
        status: ticket.status,
        customerName: ticket.name,
        customerEmail: ticket.email,
      });
    }
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
