import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const err = validateApiKey(request);
  if (err) return err;

  const replies = await prisma.savedReply.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    include: { agent: { select: { name: true } } },
  });

  const rows = replies.map((r) => ({
    Titel: r.title,
    Kategorie: r.category ?? "",
    Inhalt: r.body,
    Global: r.isGlobal ? "ja" : "nein",
    Agent: r.agent?.name ?? "",
    Erstellt: r.createdAt.toISOString().split("T")[0],
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Textbausteine");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as any);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="textbausteine-${date}.xlsx"`,
    },
  });
}
