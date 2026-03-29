import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";

export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      externalToken: true,
    },
  });

  return NextResponse.json(tickets);
}
