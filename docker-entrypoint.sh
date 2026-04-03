#!/bin/sh
set -e

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
info() { log "INFO  $*"; }
ok()   { log "OK    $*"; }
warn() { log "WARN  $*"; }
err()  { log "ERROR $*" >&2; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  ResQio Ticket System"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "================================================"
echo ""

# ── Environment check ─────────────────────────────────────────────────────────
info "Umgebung prüfen..."

if [ -z "$DATABASE_URL" ]; then
  err "DATABASE_URL ist nicht gesetzt – Migrationen und App werden fehlschlagen!"
else
  # Mask password in log output
  MASKED_URL=$(echo "$DATABASE_URL" | sed 's|://[^:]*:[^@]*@|://***:***@|')
  info "DATABASE_URL : $MASKED_URL"
fi

[ -z "$API_KEY" ]       && warn "API_KEY ist nicht gesetzt, verwende Standardwert"
[ -z "$RESEND_API_KEY" ] && warn "RESEND_API_KEY ist nicht gesetzt – E-Mail-Versand deaktiviert"

echo ""

# ── Wait for database ─────────────────────────────────────────────────────────
wait_for_database() {
  if [ -z "$DATABASE_URL" ]; then
    warn "DATABASE_URL nicht gesetzt – überspringe Datenbankprüfung"
    return
  fi

  # Extract host and port from DATABASE_URL
  # Format: postgresql://user:pass@host:port/db  or  postgres://...
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+)/.*|\1|')
  [ -z "$DB_PORT" ] && DB_PORT=5432

  info "Warte auf Datenbankverbindung ($DB_HOST:$DB_PORT)..."

  MAX_TRIES=30
  TRIES=0
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
    TRIES=$((TRIES + 1))
    if [ $TRIES -ge $MAX_TRIES ]; then
      err "Datenbankverbindung nach ${MAX_TRIES} Versuchen fehlgeschlagen ($DB_HOST:$DB_PORT)"
      err "Bitte DATABASE_URL und Datenbankserver prüfen"
      exit 1
    fi
    warn "Datenbank nicht erreichbar – Versuch $TRIES/$MAX_TRIES, warte 2s..."
    sleep 2
  done
  ok "Datenbankverbindung hergestellt ($DB_HOST:$DB_PORT)"
}

wait_for_database

echo ""

# ── Database migrations ───────────────────────────────────────────────────────
info "Datenbank-Migrationen werden ausgeführt..."
set +e
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
MIGRATE_EXIT=$?
set -e

if [ $MIGRATE_EXIT -eq 0 ]; then
  ok "Migrationen erfolgreich abgeschlossen"
  # Show applied migrations from output if any
  echo "$MIGRATE_OUTPUT" | grep -E "(Applying migration|No pending|migrations)" | sed 's/^/         /' || true
else
  err "Migration fehlgeschlagen (Exit-Code $MIGRATE_EXIT)"
  echo "─── Migration Output ───────────────────────────"
  echo "$MIGRATE_OUTPUT" | sed 's/^/  /'
  echo "────────────────────────────────────────────────"
  warn "Starte App trotzdem – bitte Datenbankverbindung und Schema prüfen"
fi

echo ""

# ── Configuration summary ─────────────────────────────────────────────────────
echo "------------------------------------------------"
echo "  Konfiguration"
echo "------------------------------------------------"
echo "  Admin-URL : ${APP_URL:-http://localhost:3000}/admin"
echo "  Portal-URL: ${APP_URL:-http://localhost:3000}/portal"
echo "  Admin-User: ${ADMIN_USERNAME:-Admin}"
echo "  API-Key   : ${API_KEY:-(nicht gesetzt)} (nur fuer externe API-Zugriffe)"
echo "  NODE_ENV  : ${NODE_ENV:-development}"
echo "------------------------------------------------"
echo ""

# ── Cron daemon ───────────────────────────────────────────────────────────────
info "Cron-Daemon wird gestartet..."
crond -b -l 2
ok "Cron-Daemon gestartet"

echo ""
info "Anwendung wird gestartet (node server.js)..."
echo ""

# ── Start Next.js ─────────────────────────────────────────────────────────────
exec node server.js
