# Watcher24 SDK Examples

Three runnable example applications showing how to integrate the Watcher24
SDKs in real projects.

| Example | Stack | SDKs used |
|---------|-------|-----------|
| [`react-node/`](./react-node/) | React (Vite) + Express | `@watcher/browser`, `@watcher/react`, `@watcher/node` |
| [`nextjs/`](./nextjs/) | Next.js 15 App Router | `@watcher/nextjs`, `@watcher/browser`, `@watcher/react` |
| [`fastapi/`](./fastapi/) | Python FastAPI | `watcher-sdk` |

## SDK features covered

| Feature | react-node | nextjs | fastapi |
|---------|-----------|--------|---------|
| `audit()` | ✅ | ✅ | ✅ |
| `log()` | ✅ | ✅ | ✅ |
| `trace()` | ✅ | ✅ | ✅ |
| `metric()` | ✅ | ✅ | ✅ |
| React hooks (`useAudit`, `useLog`, `useTrace`, `useMetric`) | ✅ | ✅ | — |
| Auto-trace middleware | — | ✅ | ✅ |
| Server Actions | — | ✅ | — |
| Background flusher + shutdown | ✅ | ✅ | ✅ |

## Prerequisites

- Node.js ≥ 18, pnpm ≥ 9
- Python ≥ 3.11, uv
- A running Watcher24 gateway (`just gateway-dev` from the repo root)
- A Watcher24 API key (from the dashboard at `/settings/api-keys`)

## Quick start

```bash
# Start the gateway first
just gateway-dev

# Then pick an example and follow its README
cd examples/react-node && cat README.md
cd examples/nextjs     && cat README.md
cd examples/fastapi    && cat README.md
```
