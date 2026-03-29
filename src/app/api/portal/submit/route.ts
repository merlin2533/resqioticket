import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { z } from "zod";

const schema = z.object({
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
});

export async function POST(request: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const ticket = await prisma.ticket.create({
    data: {
      subject: parsed.data.subject,
      description: parsed.data.description,
      priority: parsed.data.priority,
      email: customer.email,
      name: customer.name,
      customerId: customer.id,
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
