# Watcher SDK (JavaScript) — Integration Guide

## Installation

```bash
# Node.js server
pnpm add @watcher/node

# Browser / React SPA
pnpm add @watcher/browser @watcher/react

# Next.js (covers all three)
pnpm add @watcher/nextjs @watcher/react
```

---

## Node.js Server

### Singleton setup

Create the client once per process in a shared module.

```ts
// lib/watcher.ts
import { createNodeClient } from "@watcher/node";

export const watcher = createNodeClient({
  apiKey: process.env.WATCHER_API_KEY!,
  appId: process.env.WATCHER_APP_ID!,
  environment: process.env.NODE_ENV ?? "production",
  gatewayUrl: process.env.WATCHER_GATEWAY_URL ?? "http://localhost:8080",
});

// Flush on graceful shutdown
process.on("beforeExit", async () => {
  await watcher.shutdown();
});
```

### Usage in any module

```ts
import { watcher } from "@/lib/watcher";

watcher.audit("user.login", { userId: "u_123", payload: { method: "email" } });
watcher.log("warn", "Slow query", { payload: { durationMs: 1200 } });
watcher.metric("api.latency", { payload: { value: 45, unit: "ms" } });
```

### Express auto-tracing

```ts
import express from "express";
import { randomUUID } from "node:crypto";
import { watcher } from "@/lib/watcher";

const app = express();

app.use((req, res, next) => {
  const traceId = (req.headers["x-trace-id"] as string) ?? randomUUID();
  const spanId = randomUUID();
  const start = Date.now();

  res.on("finish", () => {
    watcher.trace("http.request", {
      traceId,
      spanId,
      payload: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
    });
  });

  next();
});
```

---

## Next.js — App Router

Next.js requires different setup for server-side and client-side code.
Use the correct sub-path import to keep server code out of the browser bundle.

### Directory structure

```
my-nextjs-app/
├── middleware.ts           ← auto-trace API routes
├── lib/
│   └── watcher.ts          ← server singleton
├── components/
│   └── providers.tsx       ← client-side provider ("use client")
└── app/
    ├── layout.tsx           ← wrap with WatcherProvider
    └── api/
        └── orders/route.ts  ← server-side usage example
```

---

### Step 1 — Server singleton (`lib/watcher.ts`)

```ts
// lib/watcher.ts
import { createNextServerClient } from "@watcher/nextjs/server";

// This module is only ever imported by server-side code.
// Next.js will error at build time if it's accidentally imported by a Client Component.
export const watcher = createNextServerClient({
  apiKey: process.env.WATCHER_API_KEY!,
  appId: process.env.WATCHER_APP_ID!,
  environment: process.env.NODE_ENV ?? "production",
});
```

---

### Step 2 — Client provider (`components/providers.tsx`)

```tsx
// components/providers.tsx
"use client";

import { createBrowserClient } from "@watcher/browser";
import { WatcherProvider } from "@watcher/nextjs/client";
import type { ReactNode } from "react";

// Browser client — created once per page load, not per render.
const browserClient = createBrowserClient({
  apiKey: process.env.NEXT_PUBLIC_WATCHER_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WATCHER_APP_ID!,
});

export function Providers({ children }: { children: ReactNode }) {
  return <WatcherProvider client={browserClient}>{children}</WatcherProvider>;
}
```

> **Note:** `NEXT_PUBLIC_` env vars are inlined into the browser bundle at build time.
> Never use the raw `WATCHER_API_KEY` (no prefix) in Client Components — it would leak to the browser.

---

### Step 3 — Root layout (`app/layout.tsx`)

```tsx
// app/layout.tsx
import { Providers } from "@/components/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### Step 4 — Middleware (`middleware.ts`)

```ts
// middleware.ts  (project root — runs on the Edge runtime)
import { watcherMiddleware } from "@watcher/nextjs";

export const middleware = watcherMiddleware({
  apiKey: process.env.WATCHER_API_KEY!,
  appId: process.env.WATCHER_APP_ID!,
});

// Only trace API routes — skip static assets and Next.js internals
export const config = {
  matcher: "/api/:path*",
};
```

---

### Step 5 — Server Component or Route Handler

```ts
// app/api/orders/route.ts
import { watcher } from "@/lib/watcher";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const order = await createOrder(body);

  watcher.audit("order.created", {
    userId: req.headers.get("x-user-id") ?? "",
    traceId: req.headers.get("x-trace-id") ?? "",
    payload: { orderId: order.id, total: order.total },
  });

  return NextResponse.json(order);
}
```

```tsx
// app/dashboard/page.tsx  (Server Component)
import { watcher } from "@/lib/watcher";

export default async function DashboardPage() {
  watcher.log("info", "dashboard.viewed");
  const data = await fetchDashboardData();
  return <Dashboard data={data} />;
}
```

---

### Step 6 — Client Component with hooks

```tsx
// components/checkout-button.tsx
"use client";

import { useAudit, useLog } from "@watcher/nextjs/client";

export function CheckoutButton({ cartId }: { cartId: string }) {
  const audit = useAudit();
  const log = useLog();

  async function handleClick() {
    try {
      await submitCheckout(cartId);
      audit("checkout.completed", { payload: { cartId } });
    } catch (err) {
      log("error", "checkout.failed", { payload: { cartId, error: String(err) } });
    }
  }

  return <button onClick={handleClick}>Checkout</button>;
}
```

---

### Summary: server vs client

| Where | Import | Transport |
|-------|--------|-----------|
| `middleware.ts` | `@watcher/nextjs` | Edge (fetch) |
| Server Components, Route Handlers, Server Actions | `@watcher/nextjs/server` | Node.js (node:https) |
| Client Components (`"use client"`) | `@watcher/nextjs/client` | Browser (fetch + sendBeacon) |

---

## React SPA (Vite / Create React App)

```tsx
// main.tsx
import { createBrowserClient } from "@watcher/browser";
import { WatcherProvider } from "@watcher/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const client = createBrowserClient({
  apiKey: import.meta.env.VITE_WATCHER_API_KEY,
  appId: import.meta.env.VITE_WATCHER_APP_ID,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WatcherProvider client={client}>
      <App />
    </WatcherProvider>
  </StrictMode>,
);
```

```tsx
// Any component
import { useAudit, useLog } from "@watcher/react";

function LoginForm() {
  const audit = useAudit();
  const log = useLog();

  async function submit(data: FormData) {
    try {
      await login(data);
      audit("user.login", { payload: { method: "form" } });
    } catch {
      log("error", "login.failed");
    }
  }
}
```

---

## Distributed Tracing Across Services

Pass `x-trace-id` in HTTP headers to correlate spans across services.

```ts
// Service A — starts the trace
const traceId = randomUUID();
const response = await fetch("http://service-b/process", {
  headers: { "x-trace-id": traceId },
});
watcher.trace("service-a.call", { traceId, spanId: randomUUID() });

// Service B — receives and continues the trace
app.post("/process", (req, res) => {
  const traceId = req.headers["x-trace-id"];
  watcher.trace("service-b.process", { traceId, spanId: randomUUID() });
});
```

---

## AI / LLM Observability

```ts
async function chat(prompt: string, model: string) {
  const start = Date.now();
  const response = await openai.chat.completions.create({ model, messages: [{ role: "user", content: prompt }] });
  const durationMs = Date.now() - start;

  watcher.event("ai", "info", "llm.completion", {
    payload: {
      model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      durationMs,
    },
  });

  return response.choices[0]?.message.content;
}
```
