import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";

export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      customers: { some: { customerId: customer.id } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: projects });
}
