FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ── development ───────────────────────────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy env vars so Next.js can collect page data without hitting real services.
# These are build-time only — runtime values are injected via docker-compose.
ENV AUTH_SECRET=build-placeholder \
    NEXTAUTH_URL=http://localhost:3000 \
    EMAIL_SERVER=smtp://placeholder:placeholder@placeholder:587 \
    EMAIL_FROM=placeholder@placeholder.com \
    DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder \
    ANTHROPIC_API_KEY=placeholder \
    REPLICATE_API_TOKEN=placeholder \
    MINIO_ENDPOINT=placeholder \
    MINIO_PORT=9000 \
    MINIO_ACCESS_KEY=placeholder \
    MINIO_SECRET_KEY=placeholder

RUN npx prisma generate
RUN npm run build

# ── production ────────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + migration files
COPY --from=builder /app/prisma ./prisma

# Prisma CLI (needed for `prisma migrate deploy` in CMD)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# Prisma driver adapter + migration engine (Prisma 7 — no .prisma query engine binary)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Generated Prisma client (custom output path — app/generated/prisma)
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated

USER nextjs
EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
