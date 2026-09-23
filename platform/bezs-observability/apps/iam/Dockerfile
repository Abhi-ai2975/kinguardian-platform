# ---------- Base ----------
FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ---------- Production ----------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app ./

# Create logs directory
RUN mkdir -p /logs/IAM

# Install netcat for DB wait
RUN apk add --no-cache netcat-openbsd

EXPOSE 3000

# Wait for DB → run seed → start app
CMD ["sh", "-c", "until nc -z iam-postgres 5432; do echo 'Waiting for DB...'; sleep 2; done; pnpm prisma migrate deploy && pnpm run seed:admin && pnpm run seed:patient-menu && pnpm run seed:doctor-menu && pnpm run seed:telemedicine-app-admin-menu && pnpm start"]