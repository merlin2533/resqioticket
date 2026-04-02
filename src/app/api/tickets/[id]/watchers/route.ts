import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const watchers = await prisma.ticketWatcher.findMany({
    where: { ticketId: id },
    include: { agent: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ data: watchers });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { agentId } = body as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  try {
    const watcher = await prisma.ticketWatcher.create({
      data: { ticketId: id, agentId },
      include: { agent: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: watcher }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Already watching" }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const agentId = searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  await prisma.ticketWatcher.deleteMany({ where: { ticketId: id, agentId } });
  return NextResponse.json({ ok: true });
}
