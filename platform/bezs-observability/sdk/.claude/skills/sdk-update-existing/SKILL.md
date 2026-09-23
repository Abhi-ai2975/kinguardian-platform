---
name: sdk-update-existing
description: What to update across all existing SDKs when the platform changes — new event type, new option, new gateway field, changed method signature. Use when a gateway or platform change requires SDK updates. Always update all SDKs (JS, Python, Go, Rust) in the same commit.
---

# Updating Existing SDKs

When anything changes in the gateway API, IAM, or platform that affects the SDK surface, **all four SDKs must be updated in the same commit**. Never update one SDK and leave the others stale.

Use `/sdk-gateway-spec` for the canonical gateway API reference.

---

## Which files to touch per change type

### New event type

A new `event_type` constant is added to the gateway.

| SDK | Files to update |
|-----|----------------|
| **JS** | `sdk/js/packages/core/src/event.ts` — add constant |
| **Python** | `sdk/python/src/watcher_sdk/event.py` — add constant |
| **Go** | `sdk/go/event.go` — add `EventTypeXxx = "xxx"` constant |
| **Rust** | `sdk/rust/src/event.rs` — add `EventType::Xxx` variant + `as_str()` arm |
| **All docs** | `sdk/*/docs/api.md` — add to event types list |
| **Console docs** | All `apps/console/src/content/docs/sdks/*.mdx` — add to event type variant list |

### New optional event field

A new optional field is added to the gateway's event JSON shape.

| SDK | Files to update |
|-----|----------------|
| **JS** | `sdk/js/packages/core/src/event.ts` — add to `EventOptions` interface; `sdk/js/packages/core/src/serializer.ts` — include in wire format |
| **Python** | `sdk/python/src/watcher_sdk/client.py` — add kwarg; `domain/event.py` — add field |
| **Go** | `sdk/go/event.go` — add to `EventFields` struct + `WithXxx` functional option; `sdk/go/watcher.go` — include in `wireEvent` construction |
| **Rust** | `sdk/rust/src/event.rs` — add field to `EventBuilder` struct + `.xxx()` builder method; `WireEvent` struct |
| **All docs** | `sdk/*/docs/api.md` — add to EventOption/builder table |
| **Console docs** | All `apps/console/src/content/docs/sdks/*.mdx` — add to EventOption table |

### New ClientOption

A new configuration option is added.

| SDK | Files to update |
|-----|----------------|
| **JS** | `sdk/js/packages/core/src/config.ts` — add field with default |
| **Python** | `sdk/python/src/watcher_sdk/client.py` — add kwarg + default |
| **Go** | `sdk/go/config.go` — add field to `ClientOptions`; update `applyDefaults()` |
| **Rust** | `sdk/rust/src/config.rs` — add field to `ClientConfigBuilder` + `build()` |
| **All .env.example** | `sdk/*/.env.example` — add env var with comment |
| **All docs** | `sdk/*/docs/configuration.md` — add row to options table |
| **Console docs** | All `apps/console/src/content/docs/sdks/*.mdx` — add row to options table |

### New header sent to gateway

A new HTTP header is added to the gateway ingestion handler.

| SDK | Files to update |
|-----|----------------|
| **JS** | `sdk/js/packages/node/src/transport.ts` — add `req.headers["X-New-Header"] = value` |
| **Python** | `sdk/python/src/watcher_sdk/adapters/http_transport.py` — add header |
| **Go** | `sdk/go/transport.go` — add `req.Header.Set("X-New-Header", value)` |
| **Rust** | `sdk/rust/src/transport.rs` — add `.set("X-New-Header", value)` |
| **Gateway spec** | Update `/sdk-gateway-spec` skill (this file's header table) |

### Version bump

When any SDK's public API surface changes (new method, removed param, new required field):

1. Bump the `version` in the manifest file (`Cargo.toml`, `go.mod`, `package.json`, `pyproject.toml`)
2. Update the `sdkVersion` / `sdk_version` constant in the transport/config file
3. Note in `sdk/*/docs/api.md` what changed

---

## What NOT to change

- Never change gateway validation logic in the SDK — it belongs in `apps/gateway-go/`
- Never add gateway-side enrichment (GeoIP, app resolution) to the SDK — the gateway does this
- Never add auth logic to the SDK — the API key is passed as-is in the `Authorization` header

---

## Tests to add/update

For any new field or method:
- Add a test proving the field appears correctly in the wire JSON (use FakeTransport)
- Add a test proving validation rejects invalid values (if the new thing is validated)

Follow the `Test<Subject>_<Condition>_<ExpectedBehaviour>` naming convention.

---

## Console docs checklist

After any SDK change, update these files:

| What changed | Console docs to update |
|---|---|
| New event type | All `sdks/*.mdx` — event type list section |
| New EventOption / builder field | All `sdks/*.mdx` — EventOption table |
| New ClientOption | All `sdks/*.mdx` — options table |
| New SDK method | All `sdks/*.mdx` — method section + method table |
| API key prefix changed | All `sdks/*.mdx` + `sdks/index.mdx` |

Docs update goes in the **same commit** as the code change.

---

## Commit message format

```
feat: <short description of the change>

Updated all SDKs (JS, Python, Go, Rust):
  - sdk/js: ...
  - sdk/python: ...
  - sdk/go: ...
  - sdk/rust: ...

Console docs updated: apps/console/src/content/docs/sdks/
```
