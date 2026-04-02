import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest, hashPassword, verifyPassword } from "@/lib/customer-auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    data: { id: customer.id, name: customer.name, email: customer.email, createdAt: customer.createdAt }
  });
}

export async function PATCH(request: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.name) updateData.name = parsed.data.name;

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "Aktuelles Passwort erforderlich" }, { status: 400 });
    }
    const valid = await verifyPassword(parsed.data.currentPassword, customer.password);
    if (!valid) {
      return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 400 });
    }
    updateData.password = await hashPassword(parsed.data.newPassword);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ data: customer });
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: updateData,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ data: updated });
}
