# IAM — Configuration

Copy `.env.example` to `.env` and fill in values before running.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_DIR` | `../logs/iam` | Directory for application log output |
| `INTERNAL_URL` | `http://localhost:5000` | Self-referential base URL, used internally by Better Auth |
| `BETTER_AUTH_SECRET` | — | Secret used to sign Better Auth session tokens |
| `BETTER_AUTH_URL` | `http://localhost:5000` | Base URL of the IAM app |
| `LOGIN_PAGE` | `http://localhost:5000/auth/sign-in` | OAuth provider login page shown to the resource owner |
| `CONSENT_PAGE` | `http://localhost:5000/auth/consent` | OAuth provider consent page |
| `SIGNUP_PAGE` | `http://localhost:5000/auth/sign-up` | OAuth provider sign-up page |
| `TWO_FACTOR_PAGE` | `http://localhost:5000/auth/two-factor` | OAuth provider two-factor challenge page |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | GitHub OAuth App credentials for "Sign in with GitHub". Create at https://github.com/settings/developers, callback URL `{BETTER_AUTH_URL}/api/auth/callback/github`. Optional — login works without it. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth credentials for "Sign in with Google". Create at https://console.cloud.google.com/apis/credentials, redirect URI `{BETTER_AUTH_URL}/api/auth/callback/google`. Optional. |
| `SMTP_EMAIL` / `SMTP_PASS` / `SMTP_FROM_NAME` | — / — / `Watcher24` | Outbound email for verification, password reset, and 2FA codes. Phase 1 uses a Gmail app password. |
| `DATABASE_URL` | `postgresql://watcher:watcher_secret@localhost:5433/iam` | PostgreSQL connection string for the **IAM database** — owned exclusively by this app, migrated with Prisma. Never shared with `WATCHER24_DATABASE_URL`. |
| `INTERNAL_API_SECRET` | — | Shared secret IAM checks on the `X-Internal-Secret` header for its `/api/internal/*` routes. Must match the value console and other internal callers send. |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe secret key, from https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook signing secret, from https://dashboard.stripe.com/webhooks. Register the webhook against `POST /api/auth/stripe/webhook`. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_ANNUAL_PRICE_ID` / `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` / `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID` | `price_...` | Price IDs for each billing plan/interval, from https://dashboard.stripe.com/products |

## Critical: shared secrets

- `BETTER_AUTH_SECRET` must be identical to the value used in `apps/console/.env` — sessions
  are validated against the same secret on both sides.
- `INTERNAL_API_SECRET` must be identical to the value used by every service that calls
  IAM's `/api/internal/*` endpoints (currently `apps/console`).

## Database ownership

`DATABASE_URL` points at the `iam` database, migrated exclusively via Prisma
(`pnpm db:migrate` / `prisma migrate dev`). No other service writes to this
database directly — see root `CLAUDE.md` rule 9 for the two-database policy.
