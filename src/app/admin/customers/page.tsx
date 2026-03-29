export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { CustomersClient } from "./CustomersClient";

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
  return <CustomersClient customers={customers} />;
}
