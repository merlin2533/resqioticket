import { NextRequest, NextResponse } from "next/server";

export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key");

  if (!process.env.API_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: API_KEY not set" },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
