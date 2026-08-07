FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ tzdata
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY keuangan_20260804.db /app/keuangan_20260804.db
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/keuangan_20260804.db
RUN npm run db:migrate && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libstdc++
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/keuangan.db
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/keuangan_20260804.db ./seed-data/keuangan.db
RUN mkdir -p /data && chown nextjs:nodejs /data
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "if [ ! -f /data/keuangan.db ]; then cp /app/seed-data/keuangan.db /data/keuangan.db; fi; node server.js"]
