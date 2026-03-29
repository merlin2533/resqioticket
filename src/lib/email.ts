import { render } from "@react-email/components";
import { getResend } from "./resend";
import TicketCreatedEmail from "@/emails/ticket-created";
import NewCommentEmail from "@/emails/new-comment";
import StatusChangedEmail from "@/emails/status-changed";
import ReminderEmail from "@/emails/reminder";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "support@yourdomain.com";

function portalLink(token: string): string {
  return `${APP_URL}/portal/tickets/${token}`;
}

export async function sendTicketCreatedEmail(data: {
  ticketNumber: number;
  subject: string;
  externalToken: string;
  recipientEmail: string;
  recipientName: string;
  description?: string;
}) {
  const link = portalLink(data.externalToken);
  const html = await render(
    TicketCreatedEmail({
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      portalLink: link,
      recipientName: data.recipientName,
      description: data.description,
    })
  );
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.recipientEmail,
    subject: `[TICKET-${data.ticketNumber}] ${data.subject} – Ticket erstellt`,
    html,
  });
}

export async function sendNewCommentEmail(data: {
  ticketNumber: number;
  subject: string;
  externalToken: string;
  recipientEmail: string;
  recipientName: string;
  commentBody: string;
  commentAuthor: string;
}) {
  const link = portalLink(data.externalToken);
  const html = await render(
    NewCommentEmail({
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      portalLink: link,
      recipientName: data.recipientName,
      commentAuthor: data.commentAuthor,
      commentBody: data.commentBody,
    })
  );
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.recipientEmail,
    subject: `Re: [TICKET-${data.ticketNumber}] ${data.subject}`,
    html,
  });
}

export async function sendStatusChangeEmail(data: {
  ticketNumber: number;
  subject: string;
  externalToken: string;
  recipientEmail: string;
  recipientName: string;
  oldStatus: string;
  newStatus: string;
}) {
  const link = portalLink(data.externalToken);
  const html = await render(
    StatusChangedEmail({
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      portalLink: link,
      recipientName: data.recipientName,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
    })
  );
  const statusLabels: Record<string, string> = {
    OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
    RESOLVED: "Geloest", CLOSED: "Geschlossen",
  };
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.recipientEmail,
    subject: `Re: [TICKET-${data.ticketNumber}] Status: ${statusLabels[data.newStatus] ?? data.newStatus}`,
    html,
  });
}

export async function sendAssignmentEmail(data: {
  ticketNumber: number;
  subject: string;
  externalToken: string;
  recipientEmail: string;
  recipientName: string;
  agentEmail: string;
  agentName: string;
}) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.agentEmail,
    subject: `[TICKET-${data.ticketNumber}] Zugewiesen: ${data.subject}`,
    html: `<p>Hallo ${data.agentName},<br/>Ticket <strong>#${data.ticketNumber}</strong> wurde Ihnen zugewiesen.<br/>Von: ${data.recipientName} (${data.recipientEmail})</p>`,
  });
}

export async function sendReminderEmail(
  agentEmail: string,
  agentName: string,
  tickets: { number: number; subject: string; createdAt: Date; priority: string }[]
) {
  const html = await render(ReminderEmail({ agentName, tickets }));
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: agentEmail,
    subject: `Erinnerung: ${tickets.length} offene Ticket(s)`,
    html,
  });
}
