import { render } from "@react-email/components";
import { getResend } from "./resend";
import { prisma } from "./prisma";
import TicketCreatedEmail from "@/emails/ticket-created";
import NewCommentEmail from "@/emails/new-comment";
import StatusChangedEmail from "@/emails/status-changed";
import ReminderEmail from "@/emails/reminder";

const APP_URL   = process.env.APP_URL   || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "support@yourdomain.com";

export function portalLink(token: string): string {
  return `${APP_URL}/portal/tickets/${token}`;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
  RESOLVED: "Geloest", CLOSED: "Geschlossen",
};

// ---------------------------------------------------------------------------
// Template engine: loads from DB, falls back to React Email
// ---------------------------------------------------------------------------

function substituteVars(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function loadDbTemplate(type: string): Promise<{ subject: string; htmlBody: string } | null> {
  try {
    const t = await prisma.emailTemplate.findUnique({ where: { type } });
    if (t && t.isActive) return { subject: t.subject, htmlBody: t.htmlBody };
  } catch { /* no DB yet – fall through */ }
  return null;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await getResend().emails.send({ from: EMAIL_FROM, to, subject, html });
}

// ---------------------------------------------------------------------------
// Ticket created
// ---------------------------------------------------------------------------
export async function sendTicketCreatedEmail(data: {
  ticketNumber: number; subject: string; externalToken: string;
  recipientEmail: string; recipientName: string; description?: string;
}) {
  const link = portalLink(data.externalToken);
  const vars: Record<string, string> = {
    ticketNumber:  String(data.ticketNumber),
    subject:       data.subject,
    portalLink:    link,
    recipientName: data.recipientName,
    description:   data.description?.replace(/<[^>]+>/g, "").slice(0, 200) ?? "",
  };

  const db = await loadDbTemplate("ticket_created");
  if (db) {
    await sendEmail(data.recipientEmail, substituteVars(db.subject, vars), substituteVars(db.htmlBody, vars));
    return;
  }

  const html = await render(TicketCreatedEmail({ ticketNumber: data.ticketNumber, subject: data.subject, portalLink: link, recipientName: data.recipientName, description: data.description }));
  await sendEmail(data.recipientEmail, `[TICKET-${data.ticketNumber}] ${data.subject} – Ticket erstellt`, html);
}

// ---------------------------------------------------------------------------
// New comment → to customer
// ---------------------------------------------------------------------------
export async function sendNewCommentEmail(data: {
  ticketNumber: number; subject: string; externalToken: string;
  recipientEmail: string; recipientName: string;
  commentBody: string; commentAuthor: string;
}) {
  const link = portalLink(data.externalToken);
  const plain = data.commentBody.replace(/<[^>]+>/g, "").slice(0, 500);
  const vars: Record<string, string> = {
    ticketNumber:  String(data.ticketNumber),
    subject:       data.subject,
    portalLink:    link,
    recipientName: data.recipientName,
    commentAuthor: data.commentAuthor,
    commentBody:   plain,
  };

  const db = await loadDbTemplate("new_comment");
  if (db) {
    await sendEmail(data.recipientEmail, substituteVars(db.subject, vars), substituteVars(db.htmlBody, vars));
    return;
  }

  const html = await render(NewCommentEmail({ ticketNumber: data.ticketNumber, subject: data.subject, portalLink: link, recipientName: data.recipientName, commentAuthor: data.commentAuthor, commentBody: data.commentBody }));
  await sendEmail(data.recipientEmail, `Re: [TICKET-${data.ticketNumber}] ${data.subject}`, html);
}

// ---------------------------------------------------------------------------
// Status changed → to customer
// ---------------------------------------------------------------------------
export async function sendStatusChangeEmail(data: {
  ticketNumber: number; subject: string; externalToken: string;
  recipientEmail: string; recipientName: string;
  oldStatus: string; newStatus: string;
}) {
  const link = portalLink(data.externalToken);
  const vars: Record<string, string> = {
    ticketNumber:   String(data.ticketNumber),
    subject:        data.subject,
    portalLink:     link,
    recipientName:  data.recipientName,
    oldStatusLabel: STATUS_LABELS[data.oldStatus] ?? data.oldStatus,
    newStatusLabel: STATUS_LABELS[data.newStatus] ?? data.newStatus,
  };

  const db = await loadDbTemplate("status_changed");
  if (db) {
    await sendEmail(data.recipientEmail, substituteVars(db.subject, vars), substituteVars(db.htmlBody, vars));
    return;
  }

  const html = await render(StatusChangedEmail({ ticketNumber: data.ticketNumber, subject: data.subject, portalLink: link, recipientName: data.recipientName, oldStatus: data.oldStatus, newStatus: data.newStatus }));
  await sendEmail(data.recipientEmail, `Re: [TICKET-${data.ticketNumber}] Status: ${STATUS_LABELS[data.newStatus] ?? data.newStatus}`, html);
}

// ---------------------------------------------------------------------------
// Agent assignment notification
// ---------------------------------------------------------------------------
export async function sendAssignmentEmail(data: {
  ticketNumber: number; subject: string; externalToken: string;
  recipientEmail: string; recipientName: string;
  agentEmail: string; agentName: string;
}) {
  await sendEmail(
    data.agentEmail,
    `[TICKET-${data.ticketNumber}] Zugewiesen: ${data.subject}`,
    `<p style="font-family:sans-serif">Hallo ${data.agentName},<br/><br/>Ticket <strong>#${data.ticketNumber}: ${data.subject}</strong> wurde Ihnen zugewiesen.<br/>Von: ${data.recipientName} (${data.recipientEmail})</p>`
  );
}

// ---------------------------------------------------------------------------
// Agent notify: new activity on assigned ticket (customer reply etc.)
// ---------------------------------------------------------------------------
export async function sendAgentNotifyEmail(data: {
  ticketNumber: number; subject: string; externalToken: string;
  agentEmail: string; agentName: string;
  commentAuthor: string; commentBody: string;
  customerEmail: string;
}) {
  const link = portalLink(data.externalToken);
  const plain = data.commentBody.replace(/<[^>]+>/g, "").slice(0, 500);
  const vars: Record<string, string> = {
    ticketNumber:  String(data.ticketNumber),
    subject:       data.subject,
    portalLink:    link,
    agentName:     data.agentName,
    commentAuthor: data.commentAuthor,
    commentBody:   plain,
    customerEmail: data.customerEmail,
    customerName:  data.commentAuthor,
  };

  const db = await loadDbTemplate("agent_notify");
  const html = db
    ? substituteVars(db.htmlBody, vars)
    : `<div style="font-family:sans-serif;max-width:600px;padding:24px">
        <h2 style="color:#7c3aed">Neue Aktivität – Ticket #${data.ticketNumber}</h2>
        <p>Hallo ${data.agentName},<br/><strong>${data.commentAuthor}</strong> hat geantwortet:</p>
        <blockquote style="border-left:3px solid #7c3aed;padding:8px 16px;background:#faf5ff;margin:16px 0">${plain}</blockquote>
        <a href="${link}" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Ticket bearbeiten →</a>
      </div>`;

  const subject = db ? substituteVars(db.subject, vars) : `[TICKET-${data.ticketNumber}] Neue Aktivität: ${data.subject}`;
  await sendEmail(data.agentEmail, subject, html);
}

// ---------------------------------------------------------------------------
// Central notification: every comment → one central address
// ---------------------------------------------------------------------------
export async function sendCentralNotifyEmail(data: {
  ticketNumber: number; subject: string; externalToken: string;
  centralEmail: string;
  eventLabel: string;
  commentAuthor: string; commentBody: string; customerEmail: string;
  agentName: string;
}) {
  const link = portalLink(data.externalToken);
  const plain = data.commentBody.replace(/<[^>]+>/g, "").slice(0, 800);
  const vars: Record<string, string> = {
    ticketNumber:  String(data.ticketNumber),
    subject:       data.subject,
    portalLink:    link,
    eventLabel:    data.eventLabel,
    commentAuthor: data.commentAuthor,
    commentBody:   plain,
    customerEmail: data.customerEmail,
    customerName:  data.commentAuthor,
    agentName:     data.agentName,
  };

  const db = await loadDbTemplate("central_notify");
  const html = db
    ? substituteVars(db.htmlBody, vars)
    : `<div style="font-family:sans-serif;max-width:600px;padding:24px">
        <h2>${data.eventLabel} – Ticket #${data.ticketNumber}</h2>
        <table style="font-size:14px;border-collapse:collapse">
          <tr><td style="color:#6b7280;padding:4px 16px 4px 0">Ticket</td><td><b>#${data.ticketNumber}</b> ${data.subject}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 16px 4px 0">Von</td><td>${data.commentAuthor} (${data.customerEmail})</td></tr>
          <tr><td style="color:#6b7280;padding:4px 16px 4px 0">Bearbeiter</td><td>${data.agentName}</td></tr>
        </table>
        <blockquote style="border-left:3px solid #0f172a;padding:8px 16px;background:#f9fafb;margin:16px 0">${plain}</blockquote>
        <a href="${link}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Ticket öffnen →</a>
      </div>`;

  const subject = db ? substituteVars(db.subject, vars) : `[TICKET-${data.ticketNumber}] ${data.eventLabel}: ${data.subject}`;
  await sendEmail(data.centralEmail, subject, html);
}

// ---------------------------------------------------------------------------
// Reminder
// ---------------------------------------------------------------------------
export async function sendReminderEmail(
  agentEmail: string, agentName: string,
  tickets: { number: number; subject: string; createdAt: Date; priority: string }[]
) {
  const ticketListHtml = tickets.map((t) =>
    `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <span style="font-family:monospace;color:#9ca3af;min-width:40px">#${t.number}</span>
      <span style="flex:1;font-weight:500">${t.subject}</span>
      <span style="font-size:12px;color:#6b7280">${new Date(t.createdAt).toLocaleDateString("de-DE")}</span>
    </div>`
  ).join("");

  const vars: Record<string, string> = {
    agentName, ticketCount: String(tickets.length), ticketListHtml,
  };

  const db = await loadDbTemplate("reminder");
  if (db) {
    await sendEmail(agentEmail, substituteVars(db.subject, vars), substituteVars(db.htmlBody, vars));
    return;
  }

  const html = await render(ReminderEmail({ agentName, tickets }));
  await sendEmail(agentEmail, `Erinnerung: ${tickets.length} offene Ticket(s)`, html);
}
