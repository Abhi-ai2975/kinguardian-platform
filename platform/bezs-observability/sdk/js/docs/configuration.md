# Watcher SDK (JavaScript) — Configuration

## Client Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | API key from IAM (`wtch_...` prefix) |
| `appId` | `string` | **required** | Your application name |
| `environment` | `string` | `"production"` | Deployment environment label |
| `gatewayUrl` | `string` | `"http://localhost:8080"` | Watcher24 gateway URL |
| `flushInterval` | `number` | `500` | Milliseconds between automatic flushes |
| `flushAt` | `number` | `100` | Flush when buffer reaches this many events |
| `maxBuffer` | `number` | `10000` | Drop oldest events when buffer exceeds this |

---

## Environment Variables

The SDK does not read env vars automatically. Pass them in from your config loader:

```ts
const client = createNodeClient({
  apiKey: process.env.WATCHER_API_KEY!,
  appId: process.env.WATCHER_APP_ID!,
  environment: process.env.WATCHER_ENVIRONMENT ?? "production",
  gatewayUrl: process.env.WATCHER_GATEWAY_URL ?? "http://localhost:8080",
});
```

**.env.example:**
```dotenv
WATCHER_API_KEY=wtch_your_key_here
WATCHER_APP_ID=my-service
WATCHER_ENVIRONMENT=production
WATCHER_GATEWAY_URL=http://localhost:8080
```

---

## Graceful Shutdown

**Node.js:**
```ts
process.on("beforeExit", async () => {
  await client.shutdown();
});
```

**Next.js** — handled automatically by `@watcher/nextjs` middleware.

---

## Browser `sendBeacon` on Page Unload

`@watcher/browser` automatically registers a `visibilitychange` listener.
When the page becomes hidden, remaining buffered events are sent via
`navigator.sendBeacon` which survives page unload unlike `fetch`.
No manual shutdown call needed in the browser.
