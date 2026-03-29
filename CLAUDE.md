# ResQio Ticket System – Entwicklungshinweise

## Tech Stack
- **Framework**: Next.js 14 (App Router) mit TypeScript
- **Datenbank**: PostgreSQL via Prisma v7 + `@prisma/adapter-pg`
- **E-Mail (Ausgang)**: Resend + React Email
- **Datei-Upload**: Google Drive API (googleapis)
- **Rich-Text-Editor**: Tiptap (mit Bild-Paste + Todo-Listen)
- **Styling**: Tailwind CSS

## Wichtige Prisma-Hinweise
- Import IMMER aus `@/generated/prisma/client` (NICHT aus `@/generated/prisma`)
- PrismaClient benötigt pg-Adapter: `new PrismaClient({ adapter: new PrismaPg(pool) })`
- Nach Schema-Änderungen: `npx prisma generate`
- Migrationen: `npx prisma migrate dev --name <name>`

## Admin-Dashboard
- Erreichbar unter `/admin`
- Auth: API-Key als Cookie `admin_session`
- Login: `/admin/login`
- Middleware in `src/middleware.ts` schützt alle `/admin/*` Routen

## API-Authentifizierung
- Header: `x-api-key: <API_KEY>`
- Portal-Endpunkte `/api/portal/*` sind öffentlich
- Admin-Auth `/api/admin/auth` ist öffentlich

## Feature-Übersicht
| Feature | Pfad |
|---------|------|
| Tickets CRUD | `/api/tickets` |
| Volltextsuche (tsvector) | `/api/tickets/search?q=...` |
| Tags | `/api/tags`, `/api/tickets/:id/tags` |
| Kommentare | `/api/tickets/:id/comments` |
| Anhänge (Google Drive) | `/api/attachments/upload`, `/api/tickets/:id/attachments` |
| Ticket-Verlinkung | `/api/tickets/:id/relations` |
| Vorlagen | `/api/templates` |
| Automatisierungsregeln | `/api/automations` |
| Audit-Log | `/api/audit` |
| Statistiken | `/api/stats`, `/api/stats/agents`, `/api/stats/timeline` |
| Erinnerungen (Cron) | `/api/cron/reminders` |
| Inbound E-Mail | `/api/inbound-email` |
| Kunden-Portal | `/portal/tickets/:token` |
| Admin | `/admin/*` |

## Google Drive Setup
1. Service Account in Google Cloud Console erstellen
2. Drive API aktivieren
3. JSON-Schlüssel als `GOOGLE_SERVICE_ACCOUNT_JSON` setzen
4. Ordner-ID als `GOOGLE_DRIVE_FOLDER_ID` setzen

## Tiptap Editor
- Komponente: `src/components/editor/TiptapEditor.tsx`
- Bilder per Copy-Paste einfügen (Upload zu Google Drive)
- Todo-Listen via Toolbar-Button `☑`
- Props: `content`, `onChange`, `placeholder`, `editable`, `ticketId`, `apiKey`, `minHeight`

## Docker
- `docker-compose up` startet PostgreSQL + App
- Cron läuft im Container, sendet stündlich Erinnerungen
- Entrypoint führt Prisma-Migrationen automatisch durch

## Automatisierungsregeln
- Auslöser: `ticket_created`, `ticket_updated`, `comment_added`
- Bedingungen: field, operator, value (AND/OR)
- Aktionen: `set_priority`, `set_status`, `assign_agent`, `add_tag`, `add_comment`
