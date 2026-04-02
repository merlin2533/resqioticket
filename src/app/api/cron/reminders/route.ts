import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { checkSlaBreach } from "@/lib/sla";

export async function POST(request: NextRequest) {
  // Authenticate via API key or cron secret
  const apiKey = request.headers.get("x-api-key");
  const cronSecret = request.headers.get("x-cron-secret");

  if (
    (!apiKey || apiKey !== process.env.API_KEY) &&
    (!cronSecret || cronSecret !== process.env.CRON_SECRET)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load settings
  let settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: "default" },
    });
  }

  if (!settings.reminderEnabled) {
    return NextResponse.json({ message: "Reminders are disabled" });
  }

  const intervalHours = settings.reminderIntervalHours;
  const escalationDays = settings.escalationDays;

  const reminderThreshold = new Date();
  reminderThreshold.setHours(reminderThreshold.getHours() - intervalHours);

  const escalationThreshold = new Date();
  escalationThreshold.setDate(escalationThreshold.getDate() - escalationDays);

  // Find open tickets older than the reminder interval
  const openTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      updatedAt: { lt: reminderThreshold },
    },
    include: {
      assignedTo: true,
    },
  });

  if (openTickets.length === 0) {
    return NextResponse.json({ message: "No reminders needed", sent: 0 });
  }

  // Escalate tickets that haven't been updated in X days
  const ticketsToEscalate = openTickets.filter(
    (t) => t.updatedAt < escalationThreshold && t.priority !== "URGENT"
  );

  for (const ticket of ticketsToEscalate) {
    const newPriority =
      ticket.priority === "LOW" ? "MEDIUM" : ticket.priority === "MEDIUM" ? "HIGH" : "URGENT";

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { priority: newPriority },
    });

    await prisma.comment.create({
      data: {
        ticketId: ticket.id,
        authorType: "SYSTEM",
        authorName: "System",
        authorEmail: "system@resqio.ticket",
        body: `Prioritaet automatisch erhoeht: ${ticket.priority} → ${newPriority} (keine Aktivitaet seit ${escalationDays} Tagen)`,
        isInternal: true,
      },
    });
  }

  // Group tickets by assigned agent
  const agentTickets = new Map<
    string,
    { agent: { id: string; email: string; name: string; reminderEnabled: boolean }; tickets: typeof openTickets }
  >();
  const unassignedTickets: typeof openTickets = [];

  for (const ticket of openTickets) {
    if (ticket.assignedTo && ticket.assignedTo.isActive) {
      const key = ticket.assignedTo.id;
      if (!agentTickets.has(key)) {
        agentTickets.set(key, { agent: ticket.assignedTo, tickets: [] });
      }
      agentTickets.get(key)!.tickets.push(ticket);
    } else {
      unassignedTickets.push(ticket);
    }
  }

  let sentCount = 0;

  // Send reminders to assigned agents
  for (const [, { agent, tickets }] of Array.from(agentTickets)) {
    if (!agent.reminderEnabled) continue;

    try {
      await sendReminderEmail(agent.email, agent.name, tickets);
      sentCount++;
    } catch (err) {
      log.error(`Failed to send reminder to ${agent.email}`, err);
    }
  }

  // Send unassigned ticket reminders to admins
  if (unassignedTickets.length > 0) {
    const admins = await prisma.agent.findMany({
      where: { role: "ADMIN", isActive: true, reminderEnabled: true },
    });

    for (const admin of admins) {
      try {
        await sendReminderEmail(admin.email, admin.name, unassignedTickets);
        sentCount++;
      } catch (err) {
        log.error(`Failed to send reminder to admin ${admin.email}`, err);
      }
    }
  }

  const breachCount = await checkSlaBreach();

  return NextResponse.json({
    message: "Reminders processed",
    sent: sentCount,
    escalated: ticketsToEscalate.length,
    totalOpenTickets: openTickets.length,
    slaBreached: breachCount,
  });
}
