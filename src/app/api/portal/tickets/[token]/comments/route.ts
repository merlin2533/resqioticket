import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { portalCommentSchema } from "@/lib/validators";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { externalToken: token },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status === "CLOSED") {
    return NextResponse.json(
      { error: "Ticket is closed and cannot accept new comments" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = portalCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId: ticket.id,
      authorType: "CUSTOMER",
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail,
      body: parsed.data.body,
      isInternal: false,
    },
  });

  // Update ticket timestamp and reopen if resolved
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      updatedAt: new Date(),
      ...(ticket.status === "RESOLVED"
        ? { status: "OPEN", resolvedAt: null }
        : {}),
    },
  });

  return NextResponse.json({ data: comment }, { status: 201 });
}
