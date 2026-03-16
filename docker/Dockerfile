# docker/Dockerfile
# Multi-stage production build for RTR MRP System

# ==================== Stage 1: Dependencies ====================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# ==================== Stage 2: Builder ====================
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
# Skip prisma db push and ensure-warehouses (they require a live DB and run at container startup)
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV DOCKER true
RUN npx next build

# ==================== Stage 3: Runner ====================
FROM node:20-alpine AS runner
WORKDIR /app

# Install netcat for health checks and openssl for Prisma
RUN apk add --no-cache netcat-openbsd openssl

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Copy Prisma CLI + engines so entrypoint can run migrations
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy scripts
COPY docker/scripts/entrypoint.sh /entrypoint.sh
COPY docker/scripts/healthcheck.sh /healthcheck.sh
RUN chmod +x /entrypoint.sh /healthcheck.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD /healthcheck.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
