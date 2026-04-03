import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const err = validateApiKey(request);
  if (err) return err;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Formulardaten" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = String(row["Name"] ?? "").trim();
    const description = String(row["Beschreibung"] ?? "").trim() || null;

    if (!name) { skipped++; continue; }

    await prisma.project.create({ data: { name, description } });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
