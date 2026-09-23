# Example: React + Node.js (Express)

A full-stack Task Tracker that shows how to integrate the Watcher24 JS SDK
in a **React frontend** (Vite) and an **Express backend** simultaneously.

## What this example covers

| Feature | Where | SDK method |
|---------|-------|------------|
| User login / logout audit | client + server | `audit()` |
| Task created / deleted audit | client | `audit()` |
| Server request tracing | server (every route) | `trace()` |
| Frontend error logging | client | `log("error", ...)` |
| Server error logging | server | `log("error", ...)` |
| Task count metric | client | `metric()` |
| Page-view tracking | client | `log("info", ...)` |

## Structure

```
react-node/
├── server/          — Express API (Node.js, @watcher/node)
│   └── src/
│       └── index.ts
└── client/          — React SPA (Vite, @watcher/browser + @watcher/react)
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── lib/watcher.ts
        ├── pages/
        │   ├── LoginPage.tsx
        │   └── TasksPage.tsx
        └── components/
            └── TaskList.tsx
```

## Quick start

```bash
# 1. Copy env files
cp .env.example .env

# 2. Install & start the server
cd server && pnpm install && pnpm dev

# 3. In a second terminal, install & start the client
cd client && pnpm install && pnpm dev
```

Open `http://localhost:5173` — the React app proxies `/api` requests to the
Express server on port `3001`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_W24_API_KEY` | _(required)_ | Your Watcher24 API key |
| `VITE_W24_APP_ID` | `task-tracker-client` | App ID shown in the dashboard |
| `VITE_W24_GATEWAY_URL` | `http://localhost:8080` | Watcher24 gateway URL |
| `W24_API_KEY` | _(required)_ | Server-side API key (can be the same) |
| `W24_APP_ID` | `task-tracker-server` | Server app ID |
| `W24_GATEWAY_URL` | `http://localhost:8080` | Watcher24 gateway URL |
| `PORT` | `3001` | Express server port |
