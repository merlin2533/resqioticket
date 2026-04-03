import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { hashPassword } from "@/lib/customer-auth";
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
  const errors: string[] = [];

  for (const row of rows) {
    const name = String(row["Name"] ?? "").trim();
    const email = String(row["E-Mail"] ?? "").trim().toLowerCase();
    const password = String(row["Passwort"] ?? "").trim() || "Bitte123!";

    if (!name || !email) { skipped++; continue; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Ungültige E-Mail: ${email}`);
      skipped++;
      continue;
    }
    if (password.length < 6) {
      errors.push(`Passwort zu kurz für ${email}`);
      skipped++;
      continue;
    }

    const exists = await prisma.customer.findUnique({ where: { email } });
    if (exists) { skipped++; continue; }

    const hashed = await hashPassword(password);
    await prisma.customer.create({ data: { name, email, password: hashed } });
    created++;
  }

  return NextResponse.json({ created, skipped, errors });
}
