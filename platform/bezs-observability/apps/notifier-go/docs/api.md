# notifier-go — Internal API

All endpoints require the `X-Internal-Secret` header matching `NOTIFIER_INTERNAL_SECRET`.

---

## POST /api/internal/notify

Trigger a notification. Used by console and IAM for transactional emails.

**Request body:**
```json
{
  "org_id":   "org_abc123",
  "user_id":  "user_xyz",        // optional — omit for org-wide
  "template": "welcome_email",
  "channels": ["email", "in_app"],
  "dedup_key": "",               // optional — set for alert-triggered notifications
  "data": {
    "name":  "Naveen",
    "email": "naveen@example.com"
  }
}
```

**Response:** `202 Accepted` — delivery happens asynchronously for external channels.

**Templates:** `welcome_email`, `alert_notification`, `api_key_created`, `team_invitation`

---

## GET /api/internal/notifications

List in-app notifications for an org.

**Query params:**
- `org_id` (required)
- `limit` (optional, default 20, max 100)

**Response:**
```json
{
  "notifications": [...],
  "unread_count": 3
}
```

---

## PATCH /api/internal/notifications/:id/read

Mark a single notification as read.

**Query params:** `org_id` (required)

**Response:** `{"ok": true}`

---

## PATCH /api/internal/notifications/read-all

Mark all notifications for the org as read.

**Query params:** `org_id` (required)

**Response:** `{"ok": true}`

---

## GET /api/internal/notifications/events

Server-Sent Events stream for real-time notification signals.

After each in-app notification is written, a lightweight signal is pushed here.
Clients should invalidate their notification list cache on receiving a message —
the event carries no payload, only the signal that something changed.

**Query params:** `org_id` (required)

**Response:** `text/event-stream` (long-lived connection)

```
data: {"type":"notification"}

: heartbeat

data: {"type":"notification"}
```

Heartbeat comments are sent every 25 seconds to keep proxies from closing the
idle connection. The console proxies this endpoint via `GET /api/notifications/stream`
so the X-Internal-Secret header never reaches the browser.

---

## GET /health

Public health check. Returns `{"ok": true}`.
