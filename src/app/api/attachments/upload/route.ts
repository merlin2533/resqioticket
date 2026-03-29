import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { uploadToDrive } from "@/lib/google-drive";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const ticketId = formData.get("ticketId") as string | null;
  const uploadedById = formData.get("uploadedById") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileId, url, size } = await uploadToDrive(buffer, file.name, file.type || "application/octet-stream");

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size,
      driveFileId: fileId,
      driveUrl: url,
      uploadedById: uploadedById ?? undefined,
    },
  });

  return NextResponse.json({ data: attachment }, { status: 201 });
}
