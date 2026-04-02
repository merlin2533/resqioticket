import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { createTicketSchema, ticketQuerySchema } from "@/lib/validators";
import { sendTicketCreatedEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { runAutomations } from "@/lib/automations";
import { Prisma } from "@/generated/prisma/client";
import { fireWebhooks } from "@/lib/webhooks";
import { emitTicketEvent } from "@/lib/sse-events";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = ticketQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, priority, assignedTo, email, search, sortBy, sortOrder, page, pageSize } =
    parsed.data;

  const where: Prisma.TicketWhereInput = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedTo) where.assignedToId = assignedTo;
  if (email) where.email = email;
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({
    data: tickets,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
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

  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.create({
    data: parsed.data,
  });

  // Audit log
  createAuditLog({ ticketId: ticket.id, action: "ticket_created", entityType: "ticket", entityId: ticket.id, newValue: { number: ticket.number, subject: ticket.subject } }).catch(() => {});

  emitTicketEvent({
    type: "ticket_created",
    ticketId: ticket.id,
    ticketNumber: ticket.number,
    subject: ticket.subject,
    message: `Von ${ticket.name} (${ticket.email})`,
  });

  // Run automations asynchronously
  runAutomations("ticket_created", { id: ticket.id, subject: ticket.subject, description: ticket.description, email: ticket.email, name: ticket.name, priority: ticket.priority, status: ticket.status }).catch(() => {});

  // Send confirmation email asynchronously
  sendTicketCreatedEmail({
    ticketNumber: ticket.number,
    subject: ticket.subject,
    externalToken: ticket.externalToken,
    recipientEmail: ticket.email,
    recipientName: ticket.name,
  }).catch((err) => console.error("Failed to send ticket created email:", err));

  // Fire Slack/Teams webhooks
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

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return NextResponse.json(
    {
      data: ticket,
      portalLink: `${appUrl}/portal/tickets/${ticket.externalToken}`,
    },
    { status: 201 }
  );
}
