// Default HTML email templates with {{variable}} placeholders.
// These are seeded into the DB via POST /api/email-templates
// Variables available per template are listed in the `variables` field.

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    type:      "ticket_created",
    name:      "Ticket erstellt",
    subject:   "[TICKET-{{ticketNumber}}] {{subject}} – Ticket erstellt",
    variables: "ticketNumber, subject, portalLink, recipientName, description",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
  <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">ResQio Ticket</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 8px; font-size: 22px; color: #111;">Ihr Ticket wurde erstellt</h2>
    <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px;">Hallo {{recipientName}},</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 600;">TICKET #{{ticketNumber}}</p>
      <p style="margin: 0; font-weight: 600; color: #111; font-size: 16px;">{{subject}}</p>
    </div>
    <p style="margin: 0 0 24px; color: #374151; font-size: 15px;">Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich darum kümmern.</p>
    <a href="{{portalLink}}" style="display: inline-block; background: #2563eb; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Ticket ansehen →</a>
    <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af;">Sie können auf diese E-Mail antworten, um einen Kommentar hinzuzufügen.<br/>Link: {{portalLink}}</p>
  </div>
</div>`,
  },
  {
    type:      "new_comment",
    name:      "Neuer Kommentar",
    subject:   "Re: [TICKET-{{ticketNumber}}] {{subject}}",
    variables: "ticketNumber, subject, portalLink, recipientName, commentAuthor, commentBody",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
  <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: 700;">ResQio Ticket</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 8px; font-size: 22px;">Neue Antwort</h2>
    <p style="margin: 0 0 4px; color: #6b7280; font-size: 15px;">Hallo {{recipientName}},</p>
    <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px;"><strong>{{commentAuthor}}</strong> hat auf Ihr Ticket geantwortet.</p>
    <div style="border-left: 4px solid #2563eb; background: #eff6ff; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #3b82f6; font-weight: 600;">TICKET #{{ticketNumber}} – {{subject}}</p>
      <div style="color: #1e3a5f; font-size: 15px; line-height: 1.6;">{{commentBody}}</div>
    </div>
    <a href="{{portalLink}}" style="display: inline-block; background: #2563eb; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Antworten →</a>
    <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af;">Link: {{portalLink}}</p>
  </div>
</div>`,
  },
  {
    type:      "status_changed",
    name:      "Status geändert",
    subject:   "Re: [TICKET-{{ticketNumber}}] Status: {{newStatusLabel}}",
    variables: "ticketNumber, subject, portalLink, recipientName, oldStatusLabel, newStatusLabel",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
  <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: 700;">ResQio Ticket</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 8px; font-size: 22px;">Status-Update</h2>
    <p style="margin: 0 0 24px; color: #6b7280;">Hallo {{recipientName}}, der Status Ihres Tickets hat sich geändert.</p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">#{{ticketNumber}} – {{subject}}</p>
      <p style="margin: 0; font-size: 16px;"><span style="color: #9ca3af; text-decoration: line-through;">{{oldStatusLabel}}</span> <strong style="color: #16a34a;">→ {{newStatusLabel}}</strong></p>
    </div>
    <a href="{{portalLink}}" style="display: inline-block; background: #2563eb; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Ticket ansehen →</a>
  </div>
</div>`,
  },
  {
    type:      "agent_notify",
    name:      "Neue Aktivität (Agent)",
    subject:   "[TICKET-{{ticketNumber}}] Neue Aktivität: {{subject}}",
    variables: "ticketNumber, subject, portalLink, agentName, commentAuthor, commentBody, customerName, customerEmail",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
  <div style="background: #7c3aed; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: 700;">ResQio Ticket</span>
    <span style="color: #ddd6fe; font-size: 13px; margin-left: 8px;">Agent-Benachrichtigung</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 8px; font-size: 22px;">Neue Aktivität</h2>
    <p style="margin: 0 0 24px; color: #6b7280;">Hallo {{agentName}}, auf Ihrem Ticket hat sich etwas getan.</p>
    <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed; font-weight: 600;">TICKET #{{ticketNumber}}</p>
      <p style="margin: 0 0 8px; font-weight: 600; color: #111;">{{subject}}</p>
      <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">Von: {{commentAuthor}} ({{customerEmail}})</p>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9d5ff; color: #374151; font-size: 15px;">{{commentBody}}</div>
    </div>
    <a href="{{portalLink}}" style="display: inline-block; background: #7c3aed; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Ticket bearbeiten →</a>
  </div>
</div>`,
  },
  {
    type:      "central_notify",
    name:      "Zentrale Benachrichtigung",
    subject:   "[TICKET-{{ticketNumber}}] {{eventLabel}}: {{subject}}",
    variables: "ticketNumber, subject, portalLink, eventLabel, commentAuthor, commentBody, customerName, customerEmail, agentName",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
  <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: 700;">ResQio Ticket</span>
    <span style="color: #94a3b8; font-size: 13px; margin-left: 8px;">Systembenachrichtigung</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 8px; font-size: 22px;">{{eventLabel}}</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #6b7280; width: 130px;">Ticket</td><td style="padding: 6px 0; font-weight: 600;">#{{ticketNumber}} – {{subject}}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Von</td><td style="padding: 6px 0;">{{commentAuthor}} ({{customerEmail}})</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Bearbeiter</td><td style="padding: 6px 0;">{{agentName}}</td></tr>
    </table>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 15px; line-height: 1.6; color: #374151;">{{commentBody}}</div>
    <a href="{{portalLink}}" style="display: inline-block; background: #0f172a; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Ticket öffnen →</a>
  </div>
</div>`,
  },
  {
    type:      "reminder",
    name:      "Erinnerung (Agent)",
    subject:   "Erinnerung: {{ticketCount}} offene Ticket(s)",
    variables: "agentName, ticketCount, ticketListHtml",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
  <div style="background: #f59e0b; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: 700;">ResQio Ticket</span>
    <span style="color: #fde68a; font-size: 13px; margin-left: 8px;">Erinnerung</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 8px; font-size: 22px;">Offene Tickets</h2>
    <p style="margin: 0 0 24px; color: #6b7280;">Hallo {{agentName}}, Sie haben <strong>{{ticketCount}}</strong> offene Ticket(s):</p>
    {{ticketListHtml}}
    <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af;">Erinnerungen können pro Agent deaktiviert werden.</p>
  </div>
</div>`,
  },
];
