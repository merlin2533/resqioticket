#!/bin/sh
# Trigger the reminder cron endpoint
curl -s -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "http://localhost:3000/api/cron/reminders"
echo ""
