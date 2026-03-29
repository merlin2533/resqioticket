import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/customer-auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
  if (!customer || !customer.isActive) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, customer.password);
  if (!valid) return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

  const token = await createSessionToken(customer.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("customer_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
