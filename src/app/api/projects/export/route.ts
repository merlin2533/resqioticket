import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const err = validateApiKey(request);
  if (err) return err;

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { customers: true, tickets: true } } },
  });

  const rows = projects.map((p) => ({
    Name: p.name,
    Beschreibung: p.description ?? "",
    Status: p.isActive ? "Aktiv" : "Inaktiv",
    Kunden: p._count.customers,
    Tickets: p._count.tickets,
    Erstellt: p.createdAt.toISOString().split("T")[0],
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Projekte");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as any);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="projekte-${date}.xlsx"`,
    },
  });
}
