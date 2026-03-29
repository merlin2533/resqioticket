import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const attachments = await prisma.attachment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: attachments });
}
