---
name: sdk-new-language
description: Complete step-by-step guide for adding a Watcher24 SDK in a new programming language. Covers file structure, gateway API implementation, transport/buffer/flusher pattern, test requirements, docs, console MDX doc, example app, justfile, and CLAUDE.md update. Use when adding PHP, Java, Ruby, Swift, or any other language SDK.
---

# Adding a New Language SDK

Follow these steps exactly. All SDKs must match the same API surface and pass the same categories of tests.

Reference the existing SDKs for patterns:
- **Go**: `sdk/go/` — idiomatic stdlib, functional options pattern
- **Rust**: `sdk/rust/` — builder pattern, `#[must_use]` on EventBuilder, `mpsc` channel flusher

Use `/sdk-gateway-spec` for the exact gateway API the SDK must implement against.

---

## 1. File structure

Create `sdk/<language>/` following this layout:

```
sdk/<language>/
├── <manifest>          — package manager file (Cargo.toml, go.mod, package.json, pyproject.toml, etc.)
├── src/ (or lib/)
│   ├── client.<ext>    — public Client API (typed event methods)
│   ├── event.<ext>     — event types, constants, wire format
│   ├── buffer.<ext>    — thread/goroutine-safe in-memory queue
│   ├── transport.<ext> — Transport interface + HTTP implementation
│   ├── flusher.<ext>   — background thread/goroutine flusher
│   ├── config.<ext>    — ClientOptions/Config with defaults
│   └── error.<ext>     — error types (if language needs it)
├── tests/              — unit tests using a FakeTransport (no live gateway)
├── docs/
│   ├── overview.md     — what the SDK does, where it fits
│   ├── api.md          — every public method with code examples
│   ├── configuration.md — all options, env vars, tuning guide
│   └── architecture.md — layers, concurrency model, retry strategy
├── justfile            — test, test-cov, build, lint, example recipes
└── README.md           — quick start (install, init, all 5 methods)
```

---

## 2. ClientOptions / Config

Every SDK must support these options. Use the language-idiomatic naming convention (camelCase for JS/Go, snake_case for Python/Rust, PascalCase for Go struct fields).

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | required | Secret key (`wtch_` prefix). Fail fast if empty. |
| `appId` | `""` / `None` | Links events to a registered app (Settings → Apps) |
| `serviceName` | `""` / `None` | Component label, sent as `X-Service-Name` |
| `environment` | `"production"` | Deployment stage sent as `X-Environment` |
| `gatewayUrl` | `"https://ingest.watcher24.io"` | Override for self-hosted |
| `flushInterval` | `500ms` | Timer-based flush interval |
| `flushAt` | `100` | Buffer-size-based flush threshold |
| `maxBuffer` | `10_000` | Drop oldest when exceeded |

**Validation**: return an error / throw / panic if `apiKey` is empty.

---

## 3. Public API — typed event methods

Every SDK must expose these methods with the exact semantics:

```
audit(message, ...options)  → event_type="audit",  severity="info"
log(severity, message, ...options)  → event_type="log",   severity=caller
trace(message, ...options)  → event_type="trace",  severity="info"
metric(message, ...options) → event_type="metric", severity="info"
event(type, severity, message, ...options) → caller sets both
```

Optional fields available on every method:
- `userId` / `user_id`
- `sessionId` / `session_id`
- `traceId` / `trace_id`
- `spanId` / `span_id`
- `parentSpanId` / `parent_span_id`
- `payload` (map/dict/object of arbitrary JSON-serialisable values)

For strongly-typed languages (Go, Rust, Java): use functional options or a builder pattern.
For dynamic languages (Python, JS, Ruby): use keyword arguments or an options object.

**Validation in typed methods**:
- `message` must not be empty → return error / throw
- `severity` (for `log`/`event`) must be one of the 5 valid values → return error / throw
- `event_type` (for `event`) must be one of the 9 valid values → return error / throw

---

## 4. Wire format

Events are serialised as a JSON array sent to `POST /v1/events`.

```json
[
  {
    "event_type": "audit",
    "severity": "info",
    "message": "user.login",
    "user_id": "u_123",
    "payload": { "method": "email" }
  }
]
```

Use `omitempty` / `skip_serializing_if` / conditional inclusion so empty optional fields are NOT serialised (no `"user_id": null` or `"user_id": ""`).

---

## 5. Transport

Define an interface/trait/abstract class:

```
interface Transport {
    send(events: WireEvent[]) → Result/error
}
```

Implement `HttpTransport`:
- `POST /v1/events` with all required headers (see `/sdk-gateway-spec`)
- Retry: `[100ms, 200ms, 400ms]` backoff on network errors and 5xx
- Never retry 4xx — drop the batch immediately
- Timeout: 10 seconds per attempt

Headers to set:
```
Authorization:  Bearer <apiKey>
Content-Type:   application/json
X-SDK-Version:  <package version>
X-Runtime:      <language>/<runtime version>
X-Environment:  <environment>
X-App-ID:       <appId>       (only if set)
X-Service-Name: <serviceName> (only if set)
```

---

## 6. Buffer

A thread-safe queue:
- `push(event)` — append; if `len >= maxBuffer`, drop the oldest first
- `drain()` → all events atomically (swap the internal store with empty)
- `size()` → current length (for threshold check)

Use whatever the language provides: `Mutex<Vec>`, `sync.Mutex`, `threading.Lock`, `synchronized`, etc.

---

## 7. Flusher

A background thread/goroutine that:
1. Drains the buffer and sends via `transport.send(events)` on a timer
2. Also flushes immediately when buffer reaches `flushAt`
3. On shutdown: performs a final flush before exiting

**Pattern** (prefer a channel/message approach over busy-polling):
```
loop:
  wait for: timer_tick OR early_trigger OR stop_signal
  if stop_signal: final_flush; exit
  else: drain_and_send
```

- `notify()` / `tick()` — called after every `push`; triggers early flush if `size >= flushAt`
- `stop()` — sends stop signal, waits for final flush, joins thread

Errors from `transport.send` must be logged (to stderr) but never propagated to the application — telemetry must never crash the host app.

---

## 8. Client

Composes Buffer + Transport + Flusher:

```
flush()    → drain buffer, send directly (blocks until done, returns error)
shutdown() → signal flusher to stop + final flush + join thread
```

`flush()` sends directly from the caller's thread (not via the flusher's channel) — this is safe because `drain()` is atomic. The flusher and the caller may both call `drain()` concurrently; whichever gets there first takes the events.

---

## 9. Tests — required coverage

Use a `FakeTransport` that records sent batches. No live gateway, no network.

Name tests following the `Test<Subject>_<Condition>_<ExpectedBehaviour>` pattern:

| Category | Tests required |
|----------|---------------|
| Config | Missing apiKey returns error |
| Config | Valid options build a client successfully |
| Audit | Valid message pushes event with correct event_type and severity |
| Audit | Empty message returns error |
| Log | All 5 severities accepted |
| Log | Invalid severity returns error |
| Trace | All span fields (traceId, spanId, parentSpanId) set correctly |
| Metric | Payload attached correctly |
| Event | Invalid event_type returns error |
| Event | Invalid severity returns error |
| Payload | Nil/None/empty payload is omitted from wire JSON |
| Flush | Sends all buffered events via transport |
| Flush | Empty buffer sends nothing (no transport call) |
| Flush | Transport error returned to caller |
| Buffer | Exceeds maxSize — oldest event dropped |
| Shutdown | Remaining events flushed before thread exits |

**Minimum: 15 tests.** More is better.

---

## 10. Justfile

```makefile
default:
    @just --list

test:
    <language test command>

test-verbose:
    <verbose>

test-cov:
    <coverage>

build:
    <build>

lint:
    <lint>

example:
    cd ../../examples/<language> && <run command>
```

---

## 11. Example app

Create `examples/<language>/` with:
- Working example that exercises ALL 5 event methods + traces with parent-child spans
- `.env.example` with `WATCHER_API_KEY`, `WATCHER_APP_ID`, `APP_ENV`
- Loads `.env` for local dev; in production reads env vars directly
- Explicit `flush()` at the end, then `shutdown()`

---

## 12. Console MDX doc

Create `apps/console/src/content/docs/sdks/<language>.mdx`:

Required sections (in this order):
1. **Frontmatter** — `title`, `description`
2. **Installation** — package manager command
3. **Initialisation** — code example showing ALL 8 options; options table
4. **Audit events** — code example with `userId`, `sessionId`, `payload`
5. **Logs** — code example with all severity levels listed
6. **Traces** — code example showing parent-child span tree
7. **Metrics** — code example with numeric payload
8. **Generic event** — code example with `EventType` variants listed
9. **EventOption / builder methods** — table of all optional fields
10. **Lifecycle** — `flush()` and `shutdown()` with code
11. **Environment variables** — bash block with all vars and comments

Options table must include all 8 rows: `apiKey`, `appId`, `serviceName`, `environment`, `gatewayUrl`, `flushInterval`, `flushAt`, `maxBuffer`.

Then update these files:
- `apps/console/src/lib/docs-nav.ts` — add `{ title: "<Lang>", href: "/docs/sdks/<language>" }` under SDKs
- `apps/console/src/content/docs/sdks/index.mdx` — add row to SDK table + entry in Choosing an SDK
- `apps/console/src/content/docs/index.mdx` — add `[<Lang> SDK →](/docs/sdks/<language>)` to Quick links

---

## 13. Root justfile

Add to `justfile`:

```makefile
# ── <Lang> SDK ────────────────────────────────────────────────────────────────

sdk-<lang>-test:
    just -f sdk/<language>/justfile test

sdk-<lang>-test-cov:
    just -f sdk/<language>/justfile test-cov

sdk-<lang>-build:
    just -f sdk/<language>/justfile build

sdk-<lang>-lint:
    just -f sdk/<language>/justfile lint
```

Add `just sdk-<lang>-test` to the `test-all` recipe.

---

## 14. CLAUDE.md

Add the new SDK to the Rule 10 SDK checklist:
- `sdk/<language>/` entry in the "update all SDKs" list
- `sdk/<language>/docs/api.md` entry in the SDK docs list
- `examples/<language>/` entry in the example apps list

---

## Checklist before committing

- [ ] All tests pass (minimum 15)
- [ ] `build` / `compile` passes with no errors
- [ ] `lint` passes with no warnings
- [ ] `sdk/<language>/docs/` — all 4 docs created
- [ ] `sdk/<language>/README.md` — created
- [ ] `sdk/<language>/justfile` — created
- [ ] `examples/<language>/` — example app with `.env.example`
- [ ] `apps/console/src/content/docs/sdks/<language>.mdx` — created
- [ ] `docs-nav.ts` — Rust added to sidebar
- [ ] `sdks/index.mdx` — updated
- [ ] `docs/index.mdx` — updated
- [ ] Root `justfile` — updated
- [ ] `CLAUDE.md` Rule 10 — updated
