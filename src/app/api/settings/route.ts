import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  reminderEnabled:        z.boolean().optional(),
  reminderIntervalHours:  z.number().int().min(1).optional(),
  escalationDays:         z.number().int().min(1).optional(),
  emailFrom:              z.string().email().optional(),
  centralNotifyEmail:     z.string().email().nullable().optional(),
  notifyAgentOnComment:   z.boolean().optional(),
  notifyCreatorOnComment: z.boolean().optional(),
  slackWebhookUrl:        z.string().url().nullable().optional(),
  teamsWebhookUrl:        z.string().url().nullable().optional(),
  slaEnabled:             z.boolean().optional(),
  slaLowHours:            z.number().int().min(1).optional(),
  slaMediumHours:         z.number().int().min(1).optional(),
  slaHighHours:           z.number().int().min(1).optional(),
  slaUrgentHours:         z.number().int().min(1).optional(),
});

async function ensureSettings() {
  return prisma.settings.upsert({
    where:  { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const settings = await ensureSettings();
  return NextResponse.json({ data: settings });
}

export async function PATCH(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await ensureSettings();
  const settings = await prisma.settings.update({
    where: { id: "default" },
    data:  parsed.data,
  });

  return NextResponse.json({ data: settings });
}
