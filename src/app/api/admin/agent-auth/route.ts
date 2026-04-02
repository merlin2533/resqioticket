import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAgentToken } from "@/lib/agent-session";
import { verifyPassword } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`agent-login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Zu viele Anmeldeversuche. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const agent = await prisma.agent.findUnique({ where: { email: parsed.data.email } });
  if (!agent || !agent.isActive || !agent.password) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, agent.password);
  if (!valid) return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

  const token = await createAgentToken({ agentId: agent.id, role: agent.role as "ADMIN" | "AGENT", name: agent.name, email: agent.email });
  const res = NextResponse.json({ ok: true, agent: { id: agent.id, name: agent.name, role: agent.role, email: agent.email } });
  res.cookies.set("agent_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("agent_session");
  return res;
}
