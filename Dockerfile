# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate
COPY . .
RUN npm run build

# Stage 2: Production dependencies only (for prisma migrate deploy at runtime)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install cron
RUN apk add --no-cache dcron curl postgresql-client

# Copy production node_modules first (includes prisma + all transitive deps for migrate deploy)
COPY --from=deps /app/node_modules ./node_modules

# Next.js standalone output (its own node_modules merge on top)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

# package.json is needed so `npx prisma` resolves the local installation
COPY --from=builder /app/package.json ./package.json

# Cron job for reminders (runs every hour)
COPY cron/crontab /etc/crontabs/root
COPY cron/reminder.sh /app/cron/reminder.sh
RUN chmod +x /app/cron/reminder.sh

# Entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
