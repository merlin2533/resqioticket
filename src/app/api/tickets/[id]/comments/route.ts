import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validators";
import { sendNewCommentEmail } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
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

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId: id,
      ...parsed.data,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  // Update ticket's updatedAt
  await prisma.ticket.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  // Send email notification if it's an agent comment and not internal
  if (parsed.data.authorType === "AGENT" && !parsed.data.isInternal) {
    sendNewCommentEmail({
      ticketNumber: ticket.number,
      subject: ticket.subject,
      externalToken: ticket.externalToken,
      recipientEmail: ticket.email,
      recipientName: ticket.name,
      commentBody: parsed.data.body,
      commentAuthor: parsed.data.authorName,
    }).catch((err) => console.error("Failed to send comment email:", err));
  }

  return NextResponse.json({ data: comment }, { status: 201 });
}
