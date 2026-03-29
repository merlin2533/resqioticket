import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const conditionSchema = z.object({
  field:    z.enum(["subject", "description", "email", "name", "priority", "status"]),
  operator: z.enum(["contains", "not_contains", "equals", "not_equals", "starts_with", "ends_with"]),
  value:    z.string(),
});

const actionSchema = z.object({
  type:  z.enum(["set_priority", "set_status", "assign_agent", "add_tag", "add_comment"]),
  value: z.string(),
});

const createSchema = z.object({
  name:       z.string().min(1).max(200),
  trigger:    z.enum(["ticket_created", "ticket_updated", "comment_added"]),
  conditions: z.object({
    items: z.array(conditionSchema),
    logic: z.enum(["AND", "OR"]).default("AND"),
  }),
  actions:    z.array(actionSchema).min(1),
  isActive:   z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: rules });
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const rule = await prisma.automationRule.create({ data: { ...parsed.data, conditions: parsed.data.conditions as object, actions: parsed.data.actions as object[] } });
  return NextResponse.json({ data: rule }, { status: 201 });
}
