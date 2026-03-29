# PRD: ResQio Ticket System

## 1. Produktvision

ResQio Ticket ist ein modernes, API-first Ticketsystem fuer Support- und Service-Teams. Tickets koennen sowohl ueber eine REST-API als auch automatisch per E-Mail-Eingang erstellt werden. Externe Kunden erhalten Zugriff auf ihre Tickets ueber sichere Links ohne Login. Die Kommunikation erfolgt ueber Resend (E-Mail) und ein internes Kommentarsystem.

---

## 2. Zielgruppen

| Rolle | Beschreibung |
|-------|-------------|
| **Agent/Mitarbeiter** | Bearbeitet Tickets, kommentiert, aendert Status |
| **Admin** | Verwaltet Mitarbeiter, Konfiguration, Erinnerungen |
| **Externer Kunde** | Erstellt Tickets per E-Mail/API, sieht Status per Link |

---

## 3. Kernfunktionen

### 3.1 Ticket-Erstellung

#### 3.1.1 Per REST-API
- `POST /api/tickets` erstellt ein neues Ticket
- Felder: `subject`, `description`, `priority`, `email`, `name`, `metadata` (optional JSON)
- Authentifizierung via API-Key (Header: `x-api-key`)
- Antwort enthaelt Ticket-ID und externen Zugangslink

#### 3.1.2 Per E-Mail-Eingang (Inbound)
- Webhook-Endpoint `POST /api/inbound-email` empfaengt eingehende E-Mails
- Kompatibel mit Resend Inbound Webhooks oder anderen Providern
- Parsing von: Absender, Betreff, Body (Text + HTML), Attachments (Metadaten)
- Automatische Ticket-Erstellung aus E-Mail-Daten
- Reply-Detection: Antworten auf bestehende Tickets (via `In-Reply-To` Header oder Ticket-ID im Betreff `[TICKET-XXX]`) werden als Kommentar hinzugefuegt

### 3.2 Ticket-Verwaltung

#### 3.2.1 Datenmodell Ticket
```
Ticket {
  id              String (cuid)
  number          Int (auto-increment, menschenlesbar)
  subject         String
  description     String (Text/HTML)
  status          Enum: OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED
  priority        Enum: LOW, MEDIUM, HIGH, URGENT
  email           String (Ersteller-E-Mail)
  name            String (Ersteller-Name)
  metadata        JSON (optional, frei belegbar)
  externalToken   String (unique, fuer externen Zugriff)
  assignedTo      Relation -> Agent (optional)
  createdAt       DateTime
  updatedAt       DateTime
  resolvedAt      DateTime (optional)
  closedAt        DateTime (optional)
}
```

#### 3.2.2 Ticket-Aktionen (API)
| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/tickets` | GET | Liste aller Tickets (Filter, Pagination, Sortierung) |
| `/api/tickets` | POST | Neues Ticket erstellen |
| `/api/tickets/:id` | GET | Ticket-Details inkl. Kommentare |
| `/api/tickets/:id` | PATCH | Ticket aktualisieren (Status, Priority, Assignment) |
| `/api/tickets/:id/comments` | GET | Kommentare eines Tickets |
| `/api/tickets/:id/comments` | POST | Kommentar hinzufuegen |

#### 3.2.3 Filter & Suche
- Filter nach: `status`, `priority`, `assignedTo`, `email`, `createdAt` (Datumsbereich)
- Volltextsuche ueber `subject` und `description`
- Sortierung nach: `createdAt`, `updatedAt`, `priority`, `number`
- Pagination: `page` + `pageSize` (Default: 20)

### 3.3 Kommentarsystem

#### 3.3.1 Datenmodell Comment
```
Comment {
  id          String (cuid)
  ticketId    Relation -> Ticket
  authorType  Enum: AGENT, CUSTOMER, SYSTEM
  authorId    String (optional, Agent-ID)
  authorName  String
  authorEmail String
  body        String (Text/HTML)
  isInternal  Boolean (default: false, interne Notizen unsichtbar fuer Kunden)
  createdAt   DateTime
}
```

#### 3.3.2 Funktionen
- Mitarbeiter koennen Kommentare als "intern" markieren (nicht sichtbar fuer Kunden)
- System-Kommentare bei Statusaenderungen (automatisch)
- Beim Erstellen eines externen Kommentars wird der Kunde per E-Mail benachrichtigt
- Mehrere Mitarbeiter koennen am gleichen Ticket kommentieren

### 3.4 Externer Zugriff

- Jedes Ticket erhaelt einen einzigartigen `externalToken`
- Zugriff ueber: `/portal/tickets/:token`
- Server-Side Rendered Seite (Next.js)
- Zeigt: Subject, Status, Priority, Beschreibung, oeffentliche Kommentare
- Kunde kann ueber Formular antworten (erstellt Kommentar vom Typ CUSTOMER)
- Kein Login erforderlich

### 3.5 E-Mail-Integration (Resend)

#### 3.5.1 Ausgehende E-Mails
Alle E-Mails werden ueber Resend versendet (`resend` npm Package).

| Trigger | E-Mail an | Inhalt |
|---------|-----------|--------|
| Ticket erstellt | Kunde | Bestätigung mit Ticketnummer + externer Link |
| Neuer Agent-Kommentar (nicht intern) | Kunde | Kommentartext + Link zum Ticket |
| Status-Aenderung | Kunde | Neuer Status + Link |
| Ticket zugewiesen | Agent | Benachrichtigung mit Ticket-Details |
| Erinnerung | Agent | Liste offener Tickets |

#### 3.5.2 E-Mail-Templates
- React-Email Templates fuer konsistentes Design
- Variablen: Ticketnummer, Subject, Status, Kommentartext, Portal-Link
- Absender konfigurierbar ueber Umgebungsvariable

#### 3.5.3 Eingehende E-Mails
- Webhook-Endpoint fuer Resend Inbound
- Verifizierung des Webhooks (Signature Check)
- Parsing und automatische Zuordnung zu Tickets

### 3.6 Agenten/Mitarbeiter-Verwaltung

#### 3.6.1 Datenmodell Agent
```
Agent {
  id              String (cuid)
  email           String (unique)
  name            String
  role            Enum: ADMIN, AGENT
  isActive        Boolean
  reminderEnabled Boolean (default: true)
  createdAt       DateTime
}
```

#### 3.6.2 API-Endpoints
| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/agents` | GET | Liste aller Agenten |
| `/api/agents` | POST | Neuen Agenten anlegen (Admin) |
| `/api/agents/:id` | PATCH | Agenten aktualisieren |
| `/api/agents/:id` | DELETE | Agenten deaktivieren |

### 3.7 Tracking & Metriken

#### 3.7.1 Zeiterfassung
- `createdAt`: Erstellzeitpunkt
- `updatedAt`: Letzte Aenderung
- `resolvedAt`: Zeitpunkt der Loesung
- Berechnete Felder: `responseTime` (Zeit bis erster Agent-Kommentar), `resolutionTime` (Zeit bis resolved)

#### 3.7.2 Dashboard-API
| Endpoint | Beschreibung |
|----------|-------------|
| `GET /api/stats` | Uebersicht: Offene, In Bearbeitung, Geloeste Tickets |
| `GET /api/stats/agents` | Tickets pro Agent, Durchschnittliche Bearbeitungszeit |
| `GET /api/stats/timeline` | Tickets ueber Zeit (erstellt/geloest pro Tag) |

### 3.8 Erinnerungen (Reminders)

#### 3.8.1 Funktionsweise
- Cron-basiert (via API Route `/api/cron/reminders`, aufrufbar durch externen Cron oder Vercel Cron)
- Prueft alle offenen Tickets die aelter als X Stunden sind (konfigurierbar)
- Sendet E-Mail-Erinnerung an zugewiesenen Agenten
- Fallback: Wenn kein Agent zugewiesen, geht Erinnerung an alle Admins

#### 3.8.2 Konfiguration
- Global ein/ausschaltbar ueber `Settings` Tabelle
- Pro Agent ein/ausschaltbar (`reminderEnabled`)
- Intervall konfigurierbar (Default: 24h)
- Eskalation: Nach X Tagen ohne Aktivitaet wird Priority automatisch erhoeht

---

## 4. Technologie-Stack

| Komponente | Technologie |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Sprache | TypeScript |
| Datenbank | PostgreSQL |
| ORM | Prisma |
| E-Mail (Ausgang) | Resend + React Email |
| E-Mail (Eingang) | Resend Inbound Webhooks |
| Validierung | Zod |
| API Auth | API-Key basiert |
| Styling | Tailwind CSS |
| Deployment | Node.js / Docker |

---

## 5. Projektstruktur

```
resqioticket/
├── prisma/
│   ├── schema.prisma          # Datenbank-Schema
│   └── seed.ts                # Seed-Daten
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── tickets/       # Ticket CRUD
│   │   │   ├── agents/        # Agenten-Verwaltung
│   │   │   ├── inbound-email/ # E-Mail-Eingang Webhook
│   │   │   ├── stats/         # Dashboard-Statistiken
│   │   │   └── cron/          # Reminder Cron Jobs
│   │   ├── portal/
│   │   │   └── tickets/[token]/ # Externe Ticket-Ansicht
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Prisma Client Singleton
│   │   ├── resend.ts          # Resend Client
│   │   ├── auth.ts            # API-Key Validierung
│   │   ├── email-templates/   # React Email Templates
│   │   └── validators/        # Zod Schemas
│   └── types/
│       └── index.ts           # TypeScript Types
├── docs/
│   └── PRD.md
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── docker-compose.yml         # PostgreSQL fuer Entwicklung
```

---

## 6. Sicherheit

- API-Key Authentifizierung fuer alle `/api/*` Endpoints (ausser Inbound-Webhook und Portal)
- Externe Ticket-Links nutzen kryptographisch sichere Token (cuid2)
- Inbound-Webhook Signature Verification
- Rate Limiting auf API-Endpoints
- Input-Validierung mit Zod auf allen Endpoints
- SQL Injection Prevention durch Prisma ORM
- XSS Prevention durch React Server Components

---

## 7. Umgebungsvariablen

```env
DATABASE_URL=postgresql://user:password@localhost:5432/resqioticket
RESEND_API_KEY=re_xxxxx
API_KEY=your-secret-api-key
APP_URL=http://localhost:3000
EMAIL_FROM=support@yourdomain.com
REMINDER_INTERVAL_HOURS=24
REMINDER_ESCALATION_DAYS=3
INBOUND_WEBHOOK_SECRET=whsec_xxxxx
```

---

## 8. MVP-Scope (Phase 1)

1. Ticket CRUD API mit allen Feldern
2. Kommentarsystem (Agent, Customer, System)
3. E-Mail-Versand ueber Resend (Ticket-Erstellung, Kommentare, Status)
4. Inbound-E-Mail Webhook (Ticket-Erstellung + Reply-Detection)
5. Externer Ticket-Zugang per Token/Link
6. Agenten-Verwaltung
7. Basis-Statistiken
8. Erinnerungssystem (Cron)
9. Docker-Compose fuer lokale Entwicklung

---

## 9. Nicht-funktionale Anforderungen

- Response Time API: < 200ms (P95)
- E-Mail-Versand: Asynchron, kein Blocking der API Response
- Datenbank-Migrationen: Via Prisma Migrate
- Logging: Strukturiertes Logging fuer alle API-Aufrufe
- Error Handling: Konsistentes JSON-Error-Format auf allen Endpoints
