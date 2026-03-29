#!/bin/sh
set -e

echo ""
echo "================================================"
echo "  ResQio Ticket System"
echo "================================================"
echo ""

# Run database migrations
echo "» Datenbank-Migrationen werden ausgeführt..."
if npx prisma migrate deploy 2>/dev/null; then
  echo "  ✓ Migrationen erfolgreich"
else
  echo "  ! Keine Migrationen oder Fehler – weiter..."
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
