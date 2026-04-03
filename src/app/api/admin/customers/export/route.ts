import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const err = validateApiKey(request);
  if (err) return err;

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });

  const rows = customers.map((c) => ({
    Name: c.name,
    "E-Mail": c.email,
    Status: c.isActive ? "Aktiv" : "Inaktiv",
    Tickets: c._count.tickets,
    Erstellt: c.createdAt.toISOString().split("T")[0],
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kunden");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as any);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kunden-${date}.xlsx"`,
    },
  });
}
