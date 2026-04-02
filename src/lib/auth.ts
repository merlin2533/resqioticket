import { NextRequest, NextResponse } from "next/server";

export function validateApiKey(request: NextRequest): NextResponse | null {
  if (!process.env.API_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: API_KEY not set" },
      { status: 500 }
    );
  }

  // Accept admin API key
  const apiKey = request.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.API_KEY) return null;

  // Accept middleware-verified agent/admin sessions (set by middleware after HMAC verification)
  if (request.headers.get("x-agent-verified") === "1") return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
