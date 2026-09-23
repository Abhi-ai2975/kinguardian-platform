# Error Tracing & Auto-Instrumentation

> **Status: Planned** — This document describes the full implementation spec.
> Current SDKs capture `error.message` only. This feature extends them to capture
> stack frames, framework context, and unhandled errors automatically.

---

## 1. The Problem

When an error occurs inside a monitored application today, Watcher24 receives:

```json
{
  "event_type": "trace",
  "severity": "error",
  "message": "usecase.fetchBookmarks: ECONNREFUSED 127.0.0.1:5432"
}
```

That is a single string. The developer has to read it and mentally reconstruct where it happened, which files were involved, and what the call stack looked like.

What Sentry (and every mature APM) captures instead:

```json
{
  "event_type": "trace",
  "severity": "error",
  "message": "ECONNREFUSED 127.0.0.1:5432",
  "framework": "nextjs",
  "framework_version": "15.1.0",
  "runtime": "nodejs",
  "runtime_version": "22.4.0",
  "stack_frames": [
    { "file": "src/lib/bookmark-repo.ts",        "line": 8,  "col": 3,  "fn": "bookmarkRepoFindByUser" },
    { "file": "src/app/test/bookmark-use-case.ts","line": 22, "col": 5,  "fn": "fetchBookmarksUseCase" },
    { "file": "src/app/test/bookmark-controller.ts","line": 15,"col": 5,  "fn": "bookmarkController" },
    { "file": "src/app/test/actions.ts",          "line": 110,"col": 5,  "fn": "runErrorTrace" }
  ],
  "request": {
    "method": "POST",
    "url": "/test",
    "headers": { "user-agent": "Mozilla/5.0 …" }
  },
  "breadcrumbs": [
    { "ts": "2026-05-26T10:01:00Z", "type": "http",  "message": "GET /api/bookmarks → 500" },
    { "ts": "2026-05-26T10:01:00Z", "type": "query", "message": "SELECT * FROM bookmarks …" }
  ]
}
```

The goal of this feature is to get Watcher24 to that level — automatically, for every supported language and framework — without the developer writing any extra code beyond the initial `init()` call.

---

## 2. Core Principle: One Switch, Fully Configurable

There is one master flag: **`traceEverything`**.

- `false` (default) — existing behaviour. Only `error.message` is captured. No stack frames, no source context, no framework metadata. Zero overhead. Existing integrations are unaffected.
- `true` — full capture mode. Stack frames, source code lines, cause chain, framework/runtime context, request context, and breadcrumbs are all captured and sent automatically.

That is the only decision most developers need to make.

```ts
// TypeScript / Next.js — minimal opt-in
createNextServerClient({
  apiKey: "wtch_...",
  traceEverything: true,   // ← that's it
})
```

```python
# Python — minimal opt-in
watcher.init(api_key="wtch_...", trace_everything=True)
```

```java
// Java — minimal opt-in
Watcher.init(WatcherConfig.builder().apiKey("wtch_...").traceEverything(true).build());
```

```go
// Go — minimal opt-in
watcher.Init(watcher.Config{APIKey: "wtch_...", TraceEverything: true})
```

```rust
// Rust — minimal opt-in
watcher::init(watcher::Config { api_key: "wtch_...", trace_everything: true, ..Default::default() });
```

### What `traceEverything: true` enables

| Capability | Controlled by |
|---|---|
| Stack frames (file, line, fn) per error | `traceEverything` |
| Source code line at each frame | `traceEverything` |
| Full cause chain (every wrapped error) | `traceEverything` |
| Framework & runtime metadata on every event | `traceEverything` |
| Auto-capture unhandled errors / rejections / panics | `traceEverything` |
| Request context (method, URL, headers) on errors | `traceEverything` |
| Breadcrumbs (events leading up to the error) | `traceEverything` |

### Granular overrides (optional)

If `traceEverything: true` is too broad, every capability can be toggled individually. These only matter when you want to enable some things but not others.

```ts
// TypeScript / Next.js — granular control
createNextServerClient({
  apiKey: "wtch_...",

  // ── Master switch ──────────────────────────────────────────────────────
  traceEverything: false,        // default — set true to enable everything below

  // ── Granular overrides (only relevant when traceEverything is false) ──
  captureStackFrames:   false,   // stack frames + source lines per error
  captureUnhandled:     false,   // hook process.on('unhandledRejection') etc.
  captureConsoleErrors: false,   // intercept console.error calls
  captureRequestContext: false,  // attach method/URL/headers to error events
  captureBreadcrumbs:   false,   // record events leading up to each error
  stackDepth:           20,      // max frames to capture (default 20)

  // ── Framework/runtime context ─────────────────────────────────────────
  // Auto-detected when traceEverything is true. Override only if detection is wrong.
  framework:        "nextjs",    // auto-detected from process.env.NEXT_RUNTIME
  frameworkVersion: "15.1.0",   // auto-detected from node_modules/next/package.json
  runtime:          "nodejs",   // "nodejs" | "edge" | "browser" | "bun" | "deno"
  runtimeVersion:   "22.4.0",  // auto-detected from process.version
})
```

```python
# Python — granular control
watcher.init(
    api_key="wtch_...",
    trace_everything=False,        # default
    capture_stack_frames=False,
    capture_unhandled=False,
    capture_request_context=False,
    capture_breadcrumbs=False,
    stack_depth=20,
    framework="fastapi",           # auto-detected if trace_everything=True
    framework_version="0.111.0",
    runtime="cpython",
    runtime_version="3.12.4",
)
```

```java
// Java — granular control
Watcher.init(WatcherConfig.builder()
    .apiKey("wtch_...")
    .traceEverything(false)
    .captureStackFrames(false)
    .captureUnhandled(false)
    .captureRequestContext(false)
    .stackDepth(20)
    .framework("spring-boot")      // auto-detected if traceEverything=true
    .frameworkVersion("3.2.5")
    .runtime("jvm")
    .runtimeVersion(System.getProperty("java.version"))
    .build());
```

```go
// Go — granular control
watcher.Init(watcher.Config{
    APIKey:                "wtch_...",
    TraceEverything:       false,
    CaptureStackFrames:    false,
    CaptureUnhandled:      false,
    CaptureRequestContext: false,
    StackDepth:            20,
    Framework:             "gin",   // auto-detected if TraceEverything=true
    FrameworkVersion:      "1.10.0",
    Runtime:               "go",
    RuntimeVersion:        runtime.Version(),
})
```

```rust
// Rust — granular control
watcher::init(watcher::Config {
    api_key:                 "wtch_...",
    trace_everything:        false,
    capture_stack_frames:    false,
    capture_unhandled:       false,
    capture_request_context: false,
    stack_depth:             20,
    framework:               "axum",   // auto-detected if trace_everything=true
    framework_version:       "0.7.5",
    runtime:                 "rust",
    ..Default::default()
});
```

### Resolution order

When the SDK initialises, it resolves each capability using this order:

```
1. Explicit value in config (developer-provided) — always wins
2. traceEverything: true — enables all capabilities not explicitly set to false
3. Default — false (capture message only, existing behaviour)
```

This means a developer can do `traceEverything: true` and then opt out of one specific thing:

```ts
createNextServerClient({
  apiKey: "wtch_...",
  traceEverything: true,
  captureRequestContext: false,  // don't attach headers — they contain PII
})
```

All fields are sent in a `sdk_context` envelope on every event — never inferred by the gateway.

---

## 3. Stack Trace Capture

### 3.1 JavaScript / TypeScript

Every `Error` object already has `.stack`. The SDK parses it into structured frames.

**Raw stack string (Node.js):**
```
Error: ECONNREFUSED 127.0.0.1:5432
    at bookmarkRepoFindByUser (file:///app/src/lib/bookmark-repo.ts:8:3)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
```

**Parsed into frames:**
```ts
function parseStack(stack: string, depth: number): StackFrame[] {
  return stack
    .split("\n")
    .slice(1)                          // skip the "Error: message" first line
    .slice(0, depth)
    .map((line) => {
      const m = line.trim().match(
        /^at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/
      );
      if (!m) return null;
      return {
        fn:   m[1] ?? "<anonymous>",
        file: m[2],
        line: Number(m[3]),
        col:  Number(m[4]),
        // Whether this frame is inside node_modules (third-party)
        internal: m[2].includes("node_modules") || m[2].startsWith("node:"),
      };
    })
    .filter(Boolean) as StackFrame[];
}
```

The SDK attaches the parsed frames to every error-severity trace event in `payload.stack_frames`.

### 3.2 Python

Python exposes `traceback.extract_tb(exc.__traceback__)` which gives structured frame objects directly — no string parsing needed.

```python
import traceback, sys

def capture_stack(exc: BaseException, depth: int = 20) -> list[dict]:
    tb = traceback.extract_tb(exc.__traceback__, limit=depth)
    return [
        {
            "file": frame.filename,
            "line": frame.lineno,
            "fn":   frame.name,
            "src":  frame.line,         # the actual source line
            "internal": "site-packages" in frame.filename,
        }
        for frame in reversed(tb)      # innermost first
    ]
```

### 3.3 Go

Go does not have exception-based error propagation — errors are values. Stack traces require explicit capture at the point of origin using `runtime/debug.Stack()` or a library like `github.com/pkg/errors`.

```go
import (
    "fmt"
    "runtime/debug"
)

// WatcherError wraps an error with a captured stack.
type WatcherError struct {
    cause error
    stack []byte
}

func Wrap(err error) *WatcherError {
    return &WatcherError{cause: err, stack: debug.Stack()}
}

func parseGoStack(raw []byte, depth int) []StackFrame {
    lines := strings.Split(string(raw), "\n")
    var frames []StackFrame
    for i := 1; i+1 < len(lines) && len(frames) < depth; i += 2 {
        fn   := strings.TrimSpace(lines[i])
        loc  := strings.TrimSpace(lines[i+1])
        file, lineNum := parseGoFileLine(loc)
        frames = append(frames, StackFrame{Fn: fn, File: file, Line: lineNum})
    }
    return frames
}
```

Go SDK recommendation: provide a `watcher.Wrap(err)` helper that captures the stack at the call site. Without `Wrap`, only the error message is available.

### 3.4 Java

Java exceptions already carry a full `StackTraceElement[]`. No parsing needed.

```java
static List<StackFrame> captureStack(Throwable t, int depth) {
    StackTraceElement[] elements = t.getStackTrace();
    List<StackFrame> frames = new ArrayList<>();
    for (int i = 0; i < Math.min(elements.length, depth); i++) {
        StackTraceElement e = elements[i];
        frames.add(new StackFrame(
            e.getClassName() + "." + e.getMethodName(),
            e.getFileName(),
            e.getLineNumber(),
            e.getClassName().startsWith("java.") ||
            e.getClassName().startsWith("org.springframework.")
        ));
    }
    return frames;
}
```

Also capture the full `cause` chain via `t.getCause()` to build the error chain tree.

### 3.5 Rust

Rust panics carry a backtrace via `std::backtrace::Backtrace::capture()` (stable since 1.73). For `Result`-based errors, the `anyhow` crate attaches backtraces automatically.

```rust
use std::backtrace::Backtrace;

pub struct WatcherError {
    message: String,
    backtrace: Backtrace,
}

impl WatcherError {
    pub fn capture(err: impl std::error::Error) -> Self {
        Self {
            message: err.to_string(),
            backtrace: Backtrace::capture(),
        }
    }
}
```

---

## 4. Framework & Runtime Auto-Detection

When the developer does not provide `framework` / `frameworkVersion`, the SDK detects them at startup. This detection runs once and is cached.

### JavaScript / TypeScript

```ts
function detectFramework(): { framework: string; frameworkVersion: string } {
  // Next.js
  if (process.env.NEXT_RUNTIME || process.env.__NEXT_PRIVATE_ORIGIN) {
    return { framework: "nextjs", frameworkVersion: readPkgVersion("next") };
  }
  // Express
  if (moduleLoaded("express")) {
    return { framework: "express", frameworkVersion: readPkgVersion("express") };
  }
  // Fastify
  if (moduleLoaded("fastify")) {
    return { framework: "fastify", frameworkVersion: readPkgVersion("fastify") };
  }
  return { framework: "nodejs", frameworkVersion: process.version };
}

function detectRuntime(): { runtime: string; runtimeVersion: string } {
  if (process.env.NEXT_RUNTIME === "edge") return { runtime: "edge", runtimeVersion: "v8" };
  if (typeof Bun !== "undefined")          return { runtime: "bun",  runtimeVersion: Bun.version };
  if (typeof Deno !== "undefined")         return { runtime: "deno", runtimeVersion: Deno.version.deno };
  return { runtime: "nodejs", runtimeVersion: process.version };
}

function readPkgVersion(pkg: string): string {
  try {
    return require(`${pkg}/package.json`).version;
  } catch {
    return "unknown";
  }
}
```

### Python

```python
import sys, importlib.metadata

def detect_framework() -> tuple[str, str]:
    for pkg, name in [
        ("fastapi",    "fastapi"),
        ("django",     "django"),
        ("flask",      "flask"),
        ("starlette",  "starlette"),
        ("celery",     "celery"),
    ]:
        try:
            version = importlib.metadata.version(pkg)
            return name, version
        except importlib.metadata.PackageNotFoundError:
            continue
    return "python", sys.version.split()[0]
```

### Go

```go
import "runtime"

func detectRuntime() RuntimeInfo {
    return RuntimeInfo{
        Runtime:        "go",
        RuntimeVersion: runtime.Version(),
        OS:             runtime.GOOS,
        Arch:           runtime.GOARCH,
    }
}
// Framework detection in Go: check which router package is imported at link time
// using build tags or linker symbol injection. Alternatively, let the developer
// declare it explicitly — Go's static linking makes runtime detection unreliable.
```

### Java

```java
static RuntimeInfo detectRuntime() {
    String javaVersion   = System.getProperty("java.version");
    String springVersion = getSpringVersion();   // from spring-core manifest
    return new RuntimeInfo("jvm", javaVersion, "spring-boot", springVersion);
}
```

---

## 5. Global Unhandled Error Hooks

When `captureUnhandled: true`, the SDK registers global handlers that fire automatically — no manual wrapping by the developer.

### Node.js

```ts
function installNodeHooks(client: WatcherClient) {
  // Unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    client.event("trace", "error", "unhandledRejection", {
      payload: {
        error:        err.message,
        stack_frames: parseStack(err.stack ?? "", client.config.stackDepth),
        automatic:    true,
      },
    });
  });

  // Uncaught synchronous exceptions
  process.on("uncaughtException", (err) => {
    client.event("trace", "error", "uncaughtException", {
      payload: {
        error:        err.message,
        stack_frames: parseStack(err.stack ?? "", client.config.stackDepth),
        automatic:    true,
        fatal:        true,           // process will exit after this
      },
    });
    client.flush().finally(() => process.exit(1));
  });
}
```

### Browser

```ts
function installBrowserHooks(client: WatcherClient) {
  window.addEventListener("error", (event) => {
    client.event("trace", "error", "uncaughtError", {
      payload: {
        error:        event.message,
        file:         event.filename,
        line:         event.lineno,
        col:          event.colno,
        stack_frames: event.error ? parseStack(event.error.stack ?? "", client.config.stackDepth) : [],
        automatic:    true,
        url:          window.location.href,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    client.event("trace", "error", "unhandledRejection", {
      payload: {
        error:        err.message,
        stack_frames: parseStack(err.stack ?? "", client.config.stackDepth),
        automatic:    true,
        url:          window.location.href,
      },
    });
  });
}
```

### Python

```python
import sys, threading

def install_python_hooks(client):
    original_excepthook = sys.excepthook

    def watcher_excepthook(exc_type, exc_value, exc_tb):
        client.event("trace", "error", "uncaughtException", payload={
            "error":        str(exc_value),
            "stack_frames": capture_stack(exc_value),
            "automatic":    True,
            "fatal":        True,
        })
        client.flush()
        original_excepthook(exc_type, exc_value, exc_tb)

    sys.excepthook = watcher_excepthook

    # Also hook threading exceptions (Python 3.8+)
    threading.excepthook = lambda args: watcher_excepthook(
        args.exc_type, args.exc_value, args.exc_traceback
    )
```

### Java

```java
Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
    client.event("trace", "error", "uncaughtException", Map.of(
        "error",        throwable.getMessage(),
        "stack_frames", captureStack(throwable, config.stackDepth()),
        "thread",       thread.getName(),
        "automatic",    true,
        "fatal",        true
    ));
    client.flush();
});
```

### Go

Go uses `recover()` in deferred functions to catch panics. The SDK provides a middleware helper:

```go
// WatcherRecovery is a middleware for Gin / Echo / Chi / net/http
func WatcherRecovery(client *Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func() {
                if rec := recover(); rec != nil {
                    stack := debug.Stack()
                    err, _ := rec.(error)
                    if err == nil {
                        err = fmt.Errorf("%v", rec)
                    }
                    client.Event("trace", "error", "panic", map[string]any{
                        "error":        err.Error(),
                        "stack_frames": parseGoStack(stack, client.Config.StackDepth),
                        "request":      captureRequest(r),
                        "automatic":    true,
                    })
                    client.Flush()
                    http.Error(w, "Internal Server Error", 500)
                }
            }()
            next.ServeHTTP(w, r)
        })
    }
}
```

---

## 6. Framework-Specific Auto-Instrumentation

Beyond global hooks, each framework has integration points that let us capture errors earlier and with more context.

### Next.js

```ts
// In next.config.ts — SDK wraps the entire app at the config level
import { withWatcher } from "@watcher/nextjs";

export default withWatcher({
  apiKey: "wtch_...",
  captureUnhandled: true,
}, {
  // your existing next.config options
});
```

`withWatcher` internally:
- Wraps `getServerSideProps` / `getStaticProps` with try/catch
- Wraps App Router route handlers (`GET`, `POST`, etc.)
- Installs a custom `onError` handler for React error boundaries
- Injects the browser SDK into `_document.tsx` / `layout.tsx` automatically

### Django

```python
# settings.py
INSTALLED_APPS = [
    ...
    "watcher.django",   # adds middleware + signal handlers
]

WATCHER = {
    "API_KEY": "wtch_...",
    "CAPTURE_UNHANDLED": True,
}
```

The Django integration hooks:
- `got_request_exception` signal — fires on every 500
- `request_started` / `request_finished` signals for breadcrumbs
- Middleware that captures request context for each error

### Spring Boot

```java
// Auto-configured via @SpringBootApplication
// Just add the dependency and the API key property:

// application.properties
watcher.api-key=wtch_...
watcher.capture-unhandled=true
watcher.framework=spring-boot
```

The Spring Boot starter registers a `@ControllerAdvice` that intercepts all unhandled exceptions and an `ApplicationListener<ApplicationFailedEvent>` for startup failures.

### FastAPI / Starlette

```python
from watcher.fastapi import WatcherMiddleware

app = FastAPI()
app.add_middleware(WatcherMiddleware, api_key="wtch_...", capture_unhandled=True)
```

The middleware wraps each request in a try/except and captures the full stack + request context on any unhandled exception.

---

## 7. The Full Event Payload Schema

When an error is captured (automatically or manually), the event sent to the gateway looks like this:

```json
{
  "event_type": "trace",
  "severity": "error",
  "message": "ECONNREFUSED 127.0.0.1:5432",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "span_id":  "b9a2f1c3-...",
  "parent_span_id": "a1b2c3d4-...",
  "payload": {
    "error": "ECONNREFUSED 127.0.0.1:5432",
    "error_type": "Error",
    "automatic": false,
    "fatal": false,

    "stack_frames": [
      {
        "fn":       "bookmarkRepoFindByUser",
        "file":     "src/lib/bookmark-repo.ts",
        "line":     8,
        "col":      3,
        "src_line": "  throw new Error(`ECONNREFUSED ...`);",
        "internal": false
      },
      {
        "fn":       "fetchBookmarksUseCase",
        "file":     "src/app/test/bookmark-use-case.ts",
        "line":     22,
        "col":      5,
        "src_line": "    await bookmarkRepoFindByUser(userId);",
        "internal": false
      }
    ],

    "cause_chain": [
      { "message": "action.getBookmarks: …",    "type": "Error" },
      { "message": "BookmarkController.get: …", "type": "Error" },
      { "message": "usecase.fetchBookmarks: …", "type": "Error" },
      { "message": "ECONNREFUSED …",             "type": "Error" }
    ],

    "sdk_context": {
      "sdk":               "@watcher/nextjs",
      "sdk_version":       "0.5.0",
      "framework":         "nextjs",
      "framework_version": "15.1.0",
      "runtime":           "nodejs",
      "runtime_version":   "22.4.0",
      "os":                "linux",
      "arch":              "x64"
    },

    "request": {
      "method":  "POST",
      "url":     "http://localhost:3000/test",
      "headers": {
        "user-agent":   "Mozilla/5.0 …",
        "content-type": "application/json"
      }
    },

    "breadcrumbs": [
      { "ts": "2026-05-26T10:01:00.100Z", "type": "navigation", "message": "User navigated to /test" },
      { "ts": "2026-05-26T10:01:00.200Z", "type": "ui.click",   "message": "Clicked 'Fire Error Chain'" },
      { "ts": "2026-05-26T10:01:00.300Z", "type": "http",       "message": "POST /test → pending" }
    ]
  }
}
```

All fields in `payload` are optional. The gateway accepts any JSON object in `payload` and stores it in ClickHouse as-is. No gateway changes are needed for this feature — only the SDK and the console UI change.

---

## 8. What Changes Per Layer

### SDK changes (one per language)

| Change | Description |
|--------|-------------|
| Add `framework`, `frameworkVersion`, `runtime`, `runtimeVersion`, `captureUnhandled`, `stackDepth` to config | New config fields, all optional |
| Auto-detect framework and runtime at startup | Run once, cache the result |
| Parse `error.stack` / `traceback` / `StackTraceElement[]` into `stack_frames[]` | Per-language stack parser |
| Install global error hooks on `init()` when `captureUnhandled: true` | `process.on(...)`, `sys.excepthook`, `Thread.setDefaultUncaughtExceptionHandler` |
| Add framework plugin packages | `@watcher/nextjs`, `watcher-django`, `watcher-spring-boot`, etc. |
| Stamp `sdk_context` on every event | Attach framework/runtime info to all events, not just errors |

### Gateway changes

**None required.** The gateway already stores `payload` as arbitrary JSON in ClickHouse. All new fields live inside `payload`.

### Console UI changes (future)

| Change | Description |
|--------|-------------|
| Stack frame renderer | Expandable stack trace in the trace detail view — show file, line, source line |
| Framework badge | Show "Next.js 15 · Node.js 22" chip on each trace row |
| Error grouping | Group traces by the top non-internal stack frame (like Sentry's issue grouping) |
| Cause chain renderer | Show the full error bubble-up chain visually |
| Breadcrumb timeline | Timeline of breadcrumbs leading up to the error |

---

## 9. Source Maps (Production)

In production builds, file names and line numbers in the stack will reference compiled/minified output. To restore original TypeScript/source locations:

1. **Build step**: after each production build, the SDK CLI uploads source maps to the Watcher24 gateway.
2. **Gateway** stores source maps associated with the deployment's `release` version.
3. **Console** resolves stack frame locations at display time using the stored source maps.

This is scoped out of the initial implementation. In development (where the test page runs), source maps are not needed — Next.js dev server runs TypeScript directly and stacks already show original file paths.

---

## 10. Implementation Phases

### Phase 1 — Stack capture + SDK context (high value, low risk)

- Add `sdk_context` stamping to all SDKs (JS, Python, Go)
- Add `parseStack()` to JS SDK and Python SDK
- Attach `stack_frames` and `cause_chain` to all error-severity events
- Add `framework`, `runtime`, `captureUnhandled`, `stackDepth` config fields
- Auto-detect framework/runtime in JS and Python SDKs

### Phase 2 — Global hooks

- Node.js: `unhandledRejection` + `uncaughtException`
- Browser: `window.onerror` + `unhandledrejection`
- Python: `sys.excepthook` + `threading.excepthook`
- Go: panic recovery middleware
- Java: `Thread.setDefaultUncaughtExceptionHandler`

### Phase 3 — Framework plugins

- `@watcher/nextjs`: `withWatcher()` config wrapper
- `watcher-django`: `INSTALLED_APPS` integration
- `watcher-fastapi`: `WatcherMiddleware`
- `watcher-spring-boot`: starter auto-configuration

### Phase 4 — Console UI

- Stack frame renderer in trace detail
- Framework badge on trace rows
- Error grouping by stack fingerprint
- Breadcrumb timeline

### Phase 5 — Source maps (production)

- SDK CLI upload command
- Gateway source map storage
- Console-side resolution at display time

---

## 11. Key Design Decisions

**All context is stamped by the SDK, never inferred by the gateway.**
The gateway is dumb — it accepts whatever is in `payload` and stores it. This means adding new context fields never requires a gateway deploy.

**`captureUnhandled` defaults to `true`.**
Most developers want automatic capture. Opt-out is available for cases where the app handles all errors explicitly.

**`internal: true` frames are included but visually de-emphasised.**
Filtering out `node_modules` / stdlib frames entirely loses context. The console UI collapses them by default but keeps them accessible.

**Stack depth is capped at `stackDepth` (default 20).**
Deep stacks in frameworks can have 60+ frames. Beyond 20, the frames are almost always framework internals with no diagnostic value. Configurable per SDK init.

**Go requires explicit `watcher.Wrap(err)` for stack capture.**
Go errors are values, not exceptions. There is no implicit stack at the point an error is created. The SDK provides `Wrap()` as a lightweight helper — developers call it at the point they create or first catch an error. The global panic recovery middleware handles the automatic case.
