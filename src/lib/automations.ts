import { prisma } from "./prisma";
import { createAuditLog } from "./audit";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  email: string;
  name: string;
  priority: string;
  status: string;
}

type Condition = {
  field: string;
  operator: string;
  value: string;
};

type Action = {
  type: string;
  value: string;
};

function evaluateCondition(ticket: Ticket, condition: Condition): boolean {
  const raw = (ticket as unknown as Record<string, string>)[condition.field] ?? "";
  const val = raw.toLowerCase();
  const cv = condition.value.toLowerCase();
  switch (condition.operator) {
    case "contains":      return val.includes(cv);
    case "not_contains":  return !val.includes(cv);
    case "equals":        return val === cv;
    case "not_equals":    return val !== cv;
    case "starts_with":   return val.startsWith(cv);
    case "ends_with":     return val.endsWith(cv);
    default:              return false;
  }
}

function evaluateConditions(ticket: Ticket, conditions: Condition[], logic: string): boolean {
  if (!conditions.length) return true;
  return logic === "OR"
    ? conditions.some((c) => evaluateCondition(ticket, c))
    : conditions.every((c) => evaluateCondition(ticket, c));
}

async function executeAction(ticketId: string, action: Action): Promise<void> {
  switch (action.type) {
    case "set_priority":
      await prisma.ticket.update({ where: { id: ticketId }, data: { priority: action.value as never } });
      break;
    case "set_status":
      await prisma.ticket.update({ where: { id: ticketId }, data: { status: action.value as never } });
      break;
    case "assign_agent":
      await prisma.ticket.update({ where: { id: ticketId }, data: { assignedToId: action.value } });
      break;
    case "add_tag": {
      const tag = await prisma.tag.findFirst({ where: { name: action.value } });
      if (tag) {
        await prisma.ticketTag.upsert({
          where: { ticketId_tagId: { ticketId, tagId: tag.id } },
          create: { ticketId, tagId: tag.id },
          update: {},
        });
      }
      break;
    }
    case "add_comment":
      await prisma.comment.create({
        data: {
          ticketId,
          authorType: "SYSTEM",
          authorName: "Automation",
          authorEmail: "automation@resqio.ticket",
          body: action.value,
          isInternal: true,
        },
      });
      break;
  }
}

export async function runAutomations(trigger: string, ticket: Ticket): Promise<void> {
  const rules = await prisma.automationRule.findMany({
    where: { trigger, isActive: true },
  });

  for (const rule of rules) {
    const conditions = rule.conditions as { items: Condition[]; logic: string };
    const actions = rule.actions as Action[];

    const matched = evaluateConditions(
      ticket,
      conditions.items ?? [],
      conditions.logic ?? "AND"
    );

    if (!matched) continue;

    for (const action of actions) {
      await executeAction(ticket.id, action);
    }

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { runCount: { increment: 1 } },
    });

    await createAuditLog({
      ticketId: ticket.id,
      action: "automation_triggered",
      entityType: "automation_rule",
      entityId: rule.id,
      newValue: { ruleName: rule.name, actions },
    });
  }
}
