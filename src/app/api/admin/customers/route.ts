import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { hashPassword } from "@/lib/customer-auth";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

export async function GET(request: NextRequest) {
  const err = validateApiKey(request);
  if (err) return err;

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const err = validateApiKey(request);
  if (err) return err;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const exists = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "E-Mail bereits vergeben" }, { status: 409 });

  const hashed = await hashPassword(parsed.data.password);
  const customer = await prisma.customer.create({
    data: { email: parsed.data.email, name: parsed.data.name, password: hashed },
  });

  const { password: _, ...safe } = customer;
  return NextResponse.json(safe, { status: 201 });
}
