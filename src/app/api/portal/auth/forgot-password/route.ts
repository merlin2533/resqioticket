import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { randomBytes } from "crypto";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "support@yourdomain.com";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`forgot-pw:${ip}`, 5, 60 * 60 * 1000); // 5 per hour
  if (!rl.success) {
    return NextResponse.json({ ok: true }); // silently rate limit
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true }); // don't leak

  const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });

  // Always return ok to prevent email enumeration
  if (!customer || !customer.isActive) {
    return NextResponse.json({ ok: true });
  }

  // Generate secure reset token (64 hex chars)
  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.customer.update({
    where: { id: customer.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetLink = `${APP_URL}/portal/reset-password/${token}`;

  // Send reset email via Resend
  try {
    const { getResend } = await import("@/lib/resend");
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: customer.email,
      subject: "Passwort zurücksetzen – ResQio Portal",
      html: `<div style="font-family:sans-serif;max-width:500px;padding:24px">
        <h2 style="color:#1e3a5f">Passwort zurücksetzen</h2>
        <p>Hallo ${customer.name},</p>
        <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den folgenden Link:</p>
        <p><a href="${resetLink}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Passwort zurücksetzen</a></p>
        <p style="color:#6b7280;font-size:14px">Dieser Link ist 1 Stunde gültig. Wenn Sie keine Anfrage gestellt haben, ignorieren Sie diese E-Mail.</p>
      </div>`,
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  return NextResponse.json({ ok: true });
}
