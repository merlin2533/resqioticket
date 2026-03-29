import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10));

  // PostgreSQL full-text search with tsvector
  const results = await prisma.$queryRaw<
    Array<{ id: string; number: number; subject: string; status: string; priority: string; email: string; rank: number }>
  >`
    SELECT
      t.id,
      t.number,
      t.subject,
      t.status,
      t.priority,
      t.email,
      ts_rank(
        to_tsvector('german', coalesce(t.subject, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.name, '')),
        plainto_tsquery('german', ${q})
      ) AS rank
    FROM tickets t
    WHERE
      to_tsvector('german', coalesce(t.subject, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.name, ''))
      @@ plainto_tsquery('german', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ data: results, query: q });
}
