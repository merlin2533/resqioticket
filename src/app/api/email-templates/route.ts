import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-templates-default";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: templates });
}

// Seed default templates (creates only if they don't exist)
export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const results = await Promise.all(
    DEFAULT_EMAIL_TEMPLATES.map((t) =>
      prisma.emailTemplate.upsert({
        where:  { type: t.type },
        create: t,
        update: {},          // never overwrite customised templates
      })
    )
  );

  return NextResponse.json({ data: results, message: `${results.length} templates seeded` });
}
