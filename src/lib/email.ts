import { getResend } from "./resend";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "support@yourdomain.com";

interface TicketEmailData {
  ticketNumber: number;
  subject: string;
  externalToken: string;
  recipientEmail: string;
  recipientName: string;
}

function portalLink(token: string): string {
  return `${APP_URL}/portal/tickets/${token}`;
}

export async function sendTicketCreatedEmail(data: TicketEmailData) {
  const link = portalLink(data.externalToken);

  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.recipientEmail,
    subject: `[TICKET-${data.ticketNumber}] ${data.subject} - Ticket erstellt`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihr Ticket wurde erstellt</h2>
        <p>Hallo ${data.recipientName},</p>
        <p>Ihr Ticket <strong>#${data.ticketNumber}</strong> wurde erfolgreich erstellt.</p>
        <p><strong>Betreff:</strong> ${data.subject}</p>
        <p>Sie koennen den Status Ihres Tickets jederzeit hier einsehen:</p>
        <p><a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Ticket ansehen</a></p>
        <p>Oder kopieren Sie diesen Link: ${link}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">Sie koennen auf diese E-Mail antworten, um einen Kommentar hinzuzufuegen.</p>
      </div>
    `,
  });
}

export async function sendNewCommentEmail(
  data: TicketEmailData & { commentBody: string; commentAuthor: string }
) {
  const link = portalLink(data.externalToken);

  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.recipientEmail,
    subject: `Re: [TICKET-${data.ticketNumber}] ${data.subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Neuer Kommentar zu Ticket #${data.ticketNumber}</h2>
        <p>Hallo ${data.recipientName},</p>
        <p><strong>${data.commentAuthor}</strong> hat einen Kommentar hinterlassen:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${data.commentBody}
        </div>
        <p><a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Ticket ansehen</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">Sie koennen auf diese E-Mail antworten, um zu antworten.</p>
      </div>
    `,
  });
}

export async function sendStatusChangeEmail(
  data: TicketEmailData & { oldStatus: string; newStatus: string }
) {
  const link = portalLink(data.externalToken);

  const statusLabels: Record<string, string> = {
    OPEN: "Offen",
    IN_PROGRESS: "In Bearbeitung",
    WAITING: "Wartend",
    RESOLVED: "Geloest",
    CLOSED: "Geschlossen",
  };

  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.recipientEmail,
    subject: `Re: [TICKET-${data.ticketNumber}] Status geaendert: ${statusLabels[data.newStatus] || data.newStatus}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Status-Update fuer Ticket #${data.ticketNumber}</h2>
        <p>Hallo ${data.recipientName},</p>
        <p>Der Status Ihres Tickets wurde geaendert:</p>
        <p><strong>${statusLabels[data.oldStatus] || data.oldStatus}</strong> &rarr; <strong>${statusLabels[data.newStatus] || data.newStatus}</strong></p>
        <p><strong>Betreff:</strong> ${data.subject}</p>
        <p><a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Ticket ansehen</a></p>
      </div>
    `,
  });
}

export async function sendAssignmentEmail(
  data: TicketEmailData & { agentEmail: string; agentName: string }
) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: data.agentEmail,
    subject: `[TICKET-${data.ticketNumber}] Ihnen zugewiesen: ${data.subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ticket zugewiesen</h2>
        <p>Hallo ${data.agentName},</p>
        <p>Ihnen wurde Ticket <strong>#${data.ticketNumber}</strong> zugewiesen.</p>
        <p><strong>Betreff:</strong> ${data.subject}</p>
        <p><strong>Von:</strong> ${data.recipientName} (${data.recipientEmail})</p>
      </div>
    `,
  });
}

export async function sendReminderEmail(
  agentEmail: string,
  agentName: string,
  tickets: { number: number; subject: string; createdAt: Date }[]
) {
  const ticketList = tickets
    .map(
      (t) =>
        `<li><strong>#${t.number}</strong> - ${t.subject} (erstellt: ${t.createdAt.toLocaleDateString("de-DE")})</li>`
    )
    .join("");

  await getResend().emails.send({
    from: EMAIL_FROM,
    to: agentEmail,
    subject: `Erinnerung: ${tickets.length} offene Ticket(s)`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Offene Tickets - Erinnerung</h2>
        <p>Hallo ${agentName},</p>
        <p>Sie haben <strong>${tickets.length}</strong> offene Ticket(s):</p>
        <ul>${ticketList}</ul>
        <p>Bitte bearbeiten Sie diese Tickets zeitnah.</p>
      </div>
    `,
  });
}
