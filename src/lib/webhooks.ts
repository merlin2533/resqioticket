/**
 * Slack and Microsoft Teams webhook notifications
 * Called asynchronously (fire-and-forget) from ticket/comment routes.
 */

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const PRIORITY_EMOJI: Record<string, string> = {
  LOW: "🟢", MEDIUM: "🔵", HIGH: "🟠", URGENT: "🔴",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
  RESOLVED: "Gelöst", CLOSED: "Geschlossen",
};

export interface WebhookTicketData {
  ticketNumber: number;
  subject: string;
  externalToken: string;
  priority: string;
  status: string;
  customerName: string;
  customerEmail: string;
  agentName?: string;
}

// ---------------------------------------------------------------------------
// Slack (Incoming Webhook – Block Kit)
// ---------------------------------------------------------------------------
export async function sendSlackNotification(
  webhookUrl: string,
  event: "ticket_created" | "comment_added" | "status_changed",
  data: WebhookTicketData,
  extra?: { commentAuthor?: string; oldStatus?: string; newStatus?: string }
): Promise<void> {
  const link = `${APP_URL}/portal/tickets/${data.externalToken}`;
  const prio = PRIORITY_EMOJI[data.priority] ?? "⚪";

  let title = "";
  let text = "";

  if (event === "ticket_created") {
    title = `🎫 Neues Ticket #${data.ticketNumber}`;
    text = `*${data.subject}*\nVon: ${data.customerName} (${data.customerEmail})\nPriorität: ${prio} ${data.priority}`;
  } else if (event === "comment_added") {
    title = `💬 Neue Antwort – Ticket #${data.ticketNumber}`;
    text = `*${data.subject}*\nVon: ${extra?.commentAuthor ?? "Unbekannt"}\nAgent: ${data.agentName ?? "–"}`;
  } else if (event === "status_changed") {
    title = `🔄 Status geändert – Ticket #${data.ticketNumber}`;
    text = `*${data.subject}*\n${STATUS_LABEL[extra?.oldStatus ?? ""] ?? extra?.oldStatus} → ${STATUS_LABEL[extra?.newStatus ?? ""] ?? extra?.newStatus}`;
  }

  const payload = {
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${title}*\n${text}` },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Ticket öffnen" },
          url: link,
          action_id: "open_ticket",
        },
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Microsoft Teams (Adaptive Cards via Incoming Webhook)
// ---------------------------------------------------------------------------
export async function sendTeamsNotification(
  webhookUrl: string,
  event: "ticket_created" | "comment_added" | "status_changed",
  data: WebhookTicketData,
  extra?: { commentAuthor?: string; oldStatus?: string; newStatus?: string }
): Promise<void> {
  const link = `${APP_URL}/portal/tickets/${data.externalToken}`;
  const prio = PRIORITY_EMOJI[data.priority] ?? "⚪";

  let title = "";
  let facts: { title: string; value: string }[] = [];

  if (event === "ticket_created") {
    title = `🎫 Neues Ticket #${data.ticketNumber}: ${data.subject}`;
    facts = [
      { title: "Von", value: `${data.customerName} (${data.customerEmail})` },
      { title: "Priorität", value: `${prio} ${data.priority}` },
      { title: "Status", value: STATUS_LABEL[data.status] ?? data.status },
    ];
  } else if (event === "comment_added") {
    title = `💬 Neue Antwort – #${data.ticketNumber}: ${data.subject}`;
    facts = [
      { title: "Von", value: extra?.commentAuthor ?? "Unbekannt" },
      { title: "Agent", value: data.agentName ?? "–" },
    ];
  } else if (event === "status_changed") {
    title = `🔄 Status geändert – #${data.ticketNumber}: ${data.subject}`;
    facts = [
      { title: "Vorher", value: STATUS_LABEL[extra?.oldStatus ?? ""] ?? extra?.oldStatus ?? "" },
      { title: "Nachher", value: STATUS_LABEL[extra?.newStatus ?? ""] ?? extra?.newStatus ?? "" },
    ];
  }

  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", size: "Medium", weight: "Bolder", text: title },
            {
              type: "FactSet",
              facts: facts.map(f => ({ title: f.title, value: f.value })),
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Ticket öffnen",
              url: link,
            },
          ],
        },
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Convenience: fire-and-forget to both Slack and Teams
// ---------------------------------------------------------------------------
export function fireWebhooks(
  settings: { slackWebhookUrl?: string | null; teamsWebhookUrl?: string | null },
  event: "ticket_created" | "comment_added" | "status_changed",
  data: WebhookTicketData,
  extra?: { commentAuthor?: string; oldStatus?: string; newStatus?: string }
): void {
  if (settings.slackWebhookUrl) {
    sendSlackNotification(settings.slackWebhookUrl, event, data, extra).catch(err =>
      console.error("Slack webhook failed:", err)
    );
  }
  if (settings.teamsWebhookUrl) {
    sendTeamsNotification(settings.teamsWebhookUrl, event, data, extra).catch(err =>
      console.error("Teams webhook failed:", err)
    );
  }
}
