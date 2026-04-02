import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { uploadToDrive } from "@/lib/google-drive";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Find ticket by token
  const ticket = await prisma.ticket.findUnique({ where: { externalToken: token } });
  if (!ticket) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });

  // Optional auth: if customer is logged in, verify ownership
  const customer = await getCustomerFromRequest();
  if (customer && ticket.customerId && ticket.customerId !== customer.id) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  }

  // Size limit: 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max. 10 MB)" }, { status: 413 });
  }

  const filename = (file as File).name ?? "upload";
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload to Google Drive
  let driveFileId: string;
  let driveUrl: string;
  try {
    const result = await uploadToDrive(buffer, filename, mimeType);
    driveFileId = result.fileId;
    driveUrl = result.url;
  } catch (err) {
    console.error("Drive upload failed:", err);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }

  const attachment = await prisma.attachment.create({
    data: {
      ticketId: ticket.id,
      filename,
      mimeType,
      size: file.size,
      driveFileId,
      driveUrl,
      uploadedById: customer?.id,
    },
  });

  return NextResponse.json({ data: attachment }, { status: 201 });
}
