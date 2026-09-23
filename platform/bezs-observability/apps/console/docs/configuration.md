# Dashboard Configuration

Copy `.env.example` to `.env` and fill in values before running.

## Environment variables

| Variable                     | Required | Default                  | Description                                                             |
|-------------------------------|----------|---------------------------|-------------------------------------------------------------------------|
| `NEXT_PUBLIC_APP_URL`          | Yes      | `http://localhost:3001`   | Public URL of the dashboard                                             |
| `IAM_URL`                      | Yes      | `http://localhost:5000`   | Server-to-server URL of the IAM service (bypasses the Next.js proxy)    |
| `NEXT_PUBLIC_IAM_URL`          | Yes      | `http://localhost:5000`   | Browser-accessible IAM URL, used for OAuth PKCE redirects               |
| `NEXT_PUBLIC_CONSOLE_CLIENT_ID`| Yes      | —                         | OAuth client ID registered in IAM's admin panel (`/admin/oauth-clients`). Public — safe to expose. |
| `CONSOLE_CLIENT_SECRET`        | Yes      | —                         | OAuth client secret for the same client. Server-side only, never expose to the browser. |
| `CLICKHOUSE_URL`               | Yes      | `http://localhost:8123`   | ClickHouse HTTP interface URL                                           |
| `CLICKHOUSE_USER`              | Yes      | `watcher`                 | ClickHouse username                                                     |
| `CLICKHOUSE_PASSWORD`          | Yes      | `watcher_secret`          | ClickHouse password                                                     |
| `CLICKHOUSE_DB`                | Yes      | `watcher`                 | ClickHouse database name                                                |
| `INTERNAL_API_SECRET`          | Yes      | —                         | Shared secret for IAM's `/api/internal/*` endpoints. **Must match `INTERNAL_API_SECRET` in IAM.** Used by the console's `/api/public-tokens` proxy. |
| `GATEWAY_URL`                  | Yes      | `http://localhost:8080`   | Server-to-server URL used by the `/api/ingest` proxy route              |
| `NEXT_PUBLIC_REALTIME_URL`     | No       | `ws://localhost:8081`     | WebSocket URL of the realtime-go service — used by the live feed        |
| `NOTIFIER_URL`                 | No       | `http://localhost:4004`   | Server-to-server URL used by the `/api/notifications/*` proxy routes    |
| `NOTIFIER_INTERNAL_SECRET`     | No       | `change-me`               | Shared secret for notifier's internal API. **Must match `NOTIFIER_INTERNAL_SECRET` in the root `.env`.** |
| `DATABASE_URL`                 | Yes      | —                         | PostgreSQL connection string for the **IAM database** (see below)       |

## IAM service connection

App and API key management (the `applications` table and `apikey.app_id`) is handled
by calling the IAM service's HTTP API (`/api/apps/*`). The console forwards the
browser session cookie so IAM handles authentication and org resolution.

Auth itself is OAuth-based: the console registers as an OAuth client in IAM
(`NEXT_PUBLIC_CONSOLE_CLIENT_ID` / `CONSOLE_CLIENT_SECRET`) and completes a PKCE
flow against `NEXT_PUBLIC_IAM_URL` rather than sharing a `BETTER_AUTH_SECRET`.

`DATABASE_URL` is the one exception: the superadmin overview and org detail pages
(`src/lib/admin-db.ts`) query the `organization`, `member`, `subscription`, and
`user` tables directly for read-only aggregate views, so it must point at the
same Postgres database as `IAM_DATABASE_URL` in `apps/iam/.env` (port `5433`,
`iam` database) rather than the `watcher24` application database.

## Ports

| Service        | Default port |
|----------------|-------------|
| Dashboard      | 3001        |
| IAM            | 5000        |
| Realtime       | 8081        |
| Gateway        | 8080        |
| Notifier       | 4004        |
| PostgreSQL     | 5433        |
| ClickHouse     | 8123        |
| Redis          | 6379        |
