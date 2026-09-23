# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# ─── deps: install node_modules via pnpm ─────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile

# ─── builder: prisma generate + next build ────────────────────────────────────
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# Pass them with --build-arg (see docker-build.sh).
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_LIVEKIT_AGENT_URL
ARG NEXT_PUBLIC_VAPI_PUBLIC_KEY
ARG NEXT_PUBLIC_VAPI_AGENT_ID
ARG NEXT_PUBLIC_FILENEST_PROJECT_ID
ARG NEXT_PUBLIC_FILENEST_API_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID=$NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_AGENT_URL=$NEXT_PUBLIC_LIVEKIT_AGENT_URL
ENV NEXT_PUBLIC_VAPI_PUBLIC_KEY=$NEXT_PUBLIC_VAPI_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPI_AGENT_ID=$NEXT_PUBLIC_VAPI_AGENT_ID
ENV NEXT_PUBLIC_FILENEST_PROJECT_ID=$NEXT_PUBLIC_FILENEST_PROJECT_ID
ENV NEXT_PUBLIC_FILENEST_API_URL=$NEXT_PUBLIC_FILENEST_API_URL

ENV DOCKER_BUILD=true
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Generate the Prisma client (output: ./prisma/generated/prisma)
RUN pnpm dlx prisma generate --schema ./prisma/schema/schema.prisma

RUN pnpm run build

# ─── runner: minimal production image ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone output + static assets + i18n messages
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/messages ./src/messages

# Install prisma CLI globally with npm (real files, no pnpm symlink issues).
# prisma.config.ts is removed below so prisma reads DATABASE_URL from the
# environment directly — no dotenv or prisma/config module needed at runtime.
RUN npm install -g prisma@7.8.0

# Prisma schema needed by db push at runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema/schema.prisma ./prisma/schema/schema.prisma

# Drop prisma.config.ts — the standalone output includes it but it imports
# dotenv/config and prisma/config which are not available in this image.
# db push uses --schema + DATABASE_URL env var injected by docker compose.
RUN rm -f ./prisma.config.ts

# Entrypoint: runs db push, then starts the server
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Writable runtime directories
RUN mkdir -p /app/uploads /app/logs \
 && chown -R nextjs:nodejs /app/uploads /app/logs

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# All server-side env vars (DATABASE_URL, secrets, etc.) injected via --env-file
ENTRYPOINT ["./docker-entrypoint.sh"]
