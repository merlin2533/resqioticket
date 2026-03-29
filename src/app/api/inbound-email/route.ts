import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inboundEmailSchema } from "@/lib/validators";
import { sendTicketCreatedEmail } from "@/lib/email";

// Extract ticket number from subject line: [TICKET-123]
function extractTicketNumber(subject: string): number | null {
  const match = subject.match(/\[TICKET-(\d+)\]/i);
  return match ? parseInt(match[1], 10) : null;
}

// Extract sender name and email from "Name <email>" format
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  // Plain email address (no display name)
  const emailMatch = from.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (emailMatch) {
    return { name: from, email: from };
  }
  // Unrecognised format – use placeholder so ticket creation doesn't fail
  return { name: from.trim() || "Unknown", email: "unknown@inbound" };
}

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  const webhookSecret = process.env.INBOUND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-webhook-signature");
    if (!signature) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
    // Timing-safe comparison to prevent timing attacks
    const enc = new TextEncoder();
    const sigBytes = enc.encode(signature);
    const secretBytes = enc.encode(webhookSecret);
    if (
      sigBytes.length !== secretBytes.length ||
      !crypto.subtle ||
      (() => {
        let diff = 0;
        for (let i = 0; i < sigBytes.length; i++) diff |= sigBytes[i] ^ secretBytes[i];
        return diff !== 0;
      })()
    ) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = inboundEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { from, subject, text, html } = parsed.data;
  const sender = parseSender(from);
  const ticketNumber = extractTicketNumber(subject);

  // Check for In-Reply-To or ticket number in subject for reply detection
  if (ticketNumber) {
    const existingTicket = await prisma.ticket.findFirst({
      where: { number: ticketNumber },
    });

    if (existingTicket) {
      // Add as comment to existing ticket
      await prisma.comment.create({
        data: {
          ticketId: existingTicket.id,
          authorType: "CUSTOMER",
          authorName: sender.name,
          authorEmail: sender.email,
          body: html || text || "",
          isInternal: false,
        },
      });

      // Update ticket timestamp
      await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: {
          updatedAt: new Date(),
          // Reopen if it was resolved/closed
          ...(existingTicket.status === "RESOLVED" || existingTicket.status === "CLOSED"
            ? { status: "OPEN", resolvedAt: null, closedAt: null }
            : {}),
        },
      });

      return NextResponse.json({
        action: "comment_added",
        ticketId: existingTicket.id,
        ticketNumber: existingTicket.number,
      });
    }
  }

  // Create new ticket from email
  const cleanSubject = subject.replace(/^(Re:|Fw:|Fwd:)\s*/gi, "").trim();

  const ticket = await prisma.ticket.create({
    data: {
      subject: cleanSubject || "Kein Betreff",
      description: html || text || "",
      email: sender.email,
      name: sender.name,
      priority: "MEDIUM",
    },
  });

  // Send confirmation email
  sendTicketCreatedEmail({
    ticketNumber: ticket.number,
    subject: ticket.subject,
    externalToken: ticket.externalToken,
    recipientEmail: ticket.email,
    recipientName: ticket.name,
  }).catch((err) => console.error("Failed to send ticket created email:", err));

  return NextResponse.json(
    {
      action: "ticket_created",
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    },
    { status: 201 }
  );
}
