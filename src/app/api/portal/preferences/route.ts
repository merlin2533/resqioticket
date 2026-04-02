import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { z } from "zod";

const schema = z.object({
  notifyOnComment: z.boolean().optional(),
  notifyOnStatusChange: z.boolean().optional(),
});

export async function GET(_request: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    data: {
      notifyOnComment: customer.notifyOnComment,
      notifyOnStatusChange: customer.notifyOnStatusChange,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: parsed.data,
    select: { notifyOnComment: true, notifyOnStatusChange: true },
  });

  return NextResponse.json({ data: updated });
}
