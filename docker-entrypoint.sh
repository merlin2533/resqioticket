#!/bin/sh
set -e

echo ""
echo "================================================"
echo "  ResQio Ticket System"
echo "================================================"
echo ""

# Run database migrations
echo "» Datenbank-Migrationen werden ausgeführt..."
set +e
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
MIGRATE_EXIT=$?
set -e
if [ $MIGRATE_EXIT -eq 0 ]; then
  echo "  ✓ Migrationen erfolgreich"
else
  echo "  ✗ Migration fehlgeschlagen (Exit-Code $MIGRATE_EXIT):"
  echo "$MIGRATE_OUTPUT" | sed 's/^/    /'
  echo "  Starte trotzdem – bitte Datenbankverbindung und Schema prüfen."
fi

echo ""
echo "------------------------------------------------"
echo "  Konfiguration"
echo "------------------------------------------------"
echo "  Admin-URL : ${APP_URL:-http://localhost:3000}/admin"
echo "  Portal-URL: ${APP_URL:-http://localhost:3000}/portal"
echo "  API-Key   : ${API_KEY}"
echo "------------------------------------------------"
echo ""

# Start cron daemon in background
crond -b -l 2
echo "» Cron-Daemon gestartet"

echo "» Anwendung wird gestartet..."
echo ""

# Start Next.js
exec node server.js
