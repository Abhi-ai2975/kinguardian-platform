# Example: Next.js

A Next.js App Router application (Bookmark Manager) showing how to integrate
the `@watcher/nextjs` SDK across every layer of a Next.js app.

## What this example covers

| Feature | Where | SDK |
|---------|-------|-----|
| Auto-trace all API routes | `middleware.ts` | `watcherMiddleware` |
| Server Component audit on page load | `app/tasks/page.tsx` | `createNextServerClient` |
| Route Handler audit + metric | `app/api/tasks/route.ts` | `createNextServerClient` |
| Client Component interaction audit | `components/BookmarkList.tsx` | `useAudit`, `useLog` |
| Server Action audit | `app/tasks/actions.ts` | `createNextServerClient` |

## Structure

```
nextjs/
├── middleware.ts                 — auto-trace every API request
├── src/
│   ├── lib/
│   │   └── watcher.ts            — server-side singleton
│   ├── app/
│   │   ├── layout.tsx            — WatcherProvider wrapping the app
│   │   ├── page.tsx              — home (redirect to /tasks)
│   │   ├── tasks/
│   │   │   ├── page.tsx          — Server Component: list + audit page view
│   │   │   └── actions.ts        — Server Actions: create / delete
│   │   └── api/tasks/
│   │       └── route.ts          — Route Handler: GET / POST / DELETE
│   └── components/
│       ├── BookmarkList.tsx      — Client Component: useAudit on interactions
│       └── AddBookmarkForm.tsx   — Client Component: form with useLog on error
```

## Quick start

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_W24_API_KEY` | _(required)_ | Browser-side API key |
| `NEXT_PUBLIC_W24_APP_ID` | `bookmarks-client` | Browser app ID |
| `NEXT_PUBLIC_W24_GATEWAY_URL` | `http://localhost:8080` | Gateway URL |
| `W24_API_KEY` | _(required)_ | Server-side API key |
| `W24_APP_ID` | `bookmarks-server` | Server app ID |
| `W24_GATEWAY_URL` | `http://localhost:8080` | Gateway URL |
