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
echo "  API-Key   : ${API_KEY:-(nicht gesetzt)}"
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
