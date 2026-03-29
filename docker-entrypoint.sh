#!/bin/sh
set -e

# Run database migrations
npx prisma migrate deploy 2>/dev/null || echo "No migrations to run or migration failed"

# Start cron daemon in background
crond -b -l 2

# Start Next.js
exec node server.js
