import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/customer-auth";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { resetToken: parsed.data.token } });
  if (!customer || !customer.resetTokenExpiry || customer.resetTokenExpiry < new Date()) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Link." }, { status: 400 });
  }

  const hashed = await hashPassword(parsed.data.password);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  // Auto-login after reset
  const token = await createSessionToken(customer.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("customer_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
