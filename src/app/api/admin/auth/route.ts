import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminToken } from "@/lib/agent-session";
import { z } from "zod";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.success) {
    const retryAfterSecs = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSecs),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Benutzername und Passwort erforderlich" }, { status: 400 });

  const { username, password } = parsed.data;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Ungültiger Benutzername oder Passwort" }, { status: 401 });
  }

  const token = await createAdminToken(username);

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_session");
  return res;
}
