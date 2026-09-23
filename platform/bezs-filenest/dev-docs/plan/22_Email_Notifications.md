# FileNest v1.0 — Email & Notification System

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Notification Types](#2-notification-types)
3. [Email Provider Stack](#3-email-provider-stack)
4. [Template System](#4-template-system)
5. [Notification Preferences](#5-notification-preferences)
6. [Delivery Service](#6-delivery-service)
7. [In-App Notifications](#7-in-app-notifications)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)

---

## 1. Architecture

```
Triggering Event
  (usage alert, security event, webhook failure, etc.)
  ↓
NotificationService.send()
  ↓
Check recipient preferences (should this person get this notification?)
  ↓
Queue to NATS subject: filenest.internal.notifications
  ↓
Notification Worker (pull subscriber)
  ↓
  ├── Email → SES (primary) / SendGrid (fallback)
  └── In-App → notifications table (read by dashboard)
```

Notifications are always async — no notification delivery blocks the API request path.

---

## 2. Notification Types

| Event | Channel | Default Recipients | Can Disable |
|-------|---------|-------------------|-------------|
| Usage at 80% | Email + In-App | Org admins | Yes |
| Usage at 95% | Email + In-App | Org admins | No |
| Plan limit reached | Email + In-App | Org admins | No |
| API key created | Email | Key creator | No |
| API key rotated | Email | Key creator + admins | No |
| API key revoked | Email | All admins | No |
| Virus detected in file | Email + In-App | Project admins | No |
| PHI detected (action=quarantine) | Email + In-App | Project admins | No |
| Legal hold placed | Email | Org admins + project admins | No |
| WORM committed | Email | Org admins | No |
| Webhook consecutive failures (>10) | Email + In-App | Webhook creator | Yes |
| Processing job permanently failed | In-App | Project admins | Yes |
| GDPR erasure request received | Email | Org admins | No |
| GDPR erasure completed | Email | Requestor | No |
| Storage provider error | Email + In-App | Org admins | No |
| BAA signature required | Email | Org owner | No |
| Welcome (new org created) | Email | Org owner | No |
| New team member invited | Email | Invitee | No |

---

## 3. Email Provider Stack

### 3.1 Primary: AWS SES

```python
# backend/app/services/notifications/ses.py
import boto3
from botocore.exceptions import ClientError

class SESEmailProvider:
    def __init__(self):
        self.client = boto3.client("ses", region_name="us-east-1")
        self.from_address = "notifications@filenest.io"
        self.reply_to = "support@filenest.io"

    async def send(self, message: EmailMessage) -> str:
        loop = asyncio.get_event_loop()

        def _send():
            return self.client.send_email(
                Source=f"FileNest <{self.from_address}>",
                Destination={"ToAddresses": [message.to]},
                Message={
                    "Subject": {"Data": message.subject, "Charset": "UTF-8"},
                    "Body": {
                        "Html": {"Data": message.html_body, "Charset": "UTF-8"},
                        "Text": {"Data": message.text_body, "Charset": "UTF-8"},
                    },
                },
                ReplyToAddresses=[self.reply_to],
                Tags=[
                    {"Name": "notification_type", "Value": message.notification_type},
                    {"Name": "org_id", "Value": message.org_id or "system"},
                ],
            )

        result = await loop.run_in_executor(None, _send)
        return result["MessageId"]
```

### 3.2 Fallback: SendGrid

```python
class SendGridEmailProvider:
    def __init__(self):
        self.client = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)

    async def send(self, message: EmailMessage) -> str:
        msg = Mail(
            from_email=Email("notifications@filenest.io", "FileNest"),
            to_emails=To(message.to),
            subject=message.subject,
            html_content=Content("text/html", message.html_body),
            plain_text_content=Content("text/plain", message.text_body),
        )
        response = await asyncio.get_event_loop().run_in_executor(
            None, lambda: self.client.send(msg)
        )
        return response.headers.get("X-Message-Id", "unknown")
```

### 3.3 Provider Selection with Fallback

```python
class EmailProviderRouter:
    def __init__(self, primary: SESEmailProvider, fallback: SendGridEmailProvider):
        self.primary = primary
        self.fallback = fallback

    async def send(self, message: EmailMessage) -> str:
        try:
            return await self.primary.send(message)
        except Exception as e:
            logger.warning("ses_failed_falling_back_to_sendgrid", error=str(e))
            return await self.fallback.send(message)
```

---

## 4. Template System

### 4.1 Template Engine

Templates use **Jinja2** with HTML + plain-text variants. All templates extend a base layout.

```
backend/app/services/notifications/templates/
├── base.html          # Master layout (header, footer, unsubscribe link)
├── base.txt           # Plain text master
├── welcome.html
├── welcome.txt
├── usage_alert.html
├── usage_alert.txt
├── api_key_created.html
├── api_key_created.txt
├── virus_detected.html
├── virus_detected.txt
├── phi_detected.html
├── phi_detected.txt
├── legal_hold.html
├── legal_hold.txt
├── webhook_failures.html
├── gdpr_erasure_completed.html
└── team_invite.html
```

### 4.2 Base Template

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ subject }}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: white;
                 border-radius: 8px; padding: 32px; }
    .logo { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px; }
    .content { color: #374151; line-height: 1.6; }
    .btn { display: inline-block; background: #2563eb; color: white;
           padding: 10px 20px; border-radius: 6px; text-decoration: none; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;
              font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">FileNest</div>
    <div class="content">{% block content %}{% endblock %}</div>
    <div class="footer">
      <p>You're receiving this because you're an admin of
         <strong>{{ org_name }}</strong> on FileNest.</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe from non-critical notifications</a></p>
    </div>
  </div>
</body>
</html>
```

### 4.3 Usage Alert Template

```html
<!-- templates/usage_alert.html -->
{% extends "base.html" %}
{% block content %}
<h2>Storage usage alert</h2>
<p>Your organization <strong>{{ org_name }}</strong> has reached
   <strong>{{ percent }}%</strong> of its {{ metric_label }} limit.</p>

<table style="width:100%; border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 8px; color: #6b7280;">Used</td>
    <td style="padding: 8px; font-weight: 600;">{{ used_formatted }}</td>
  </tr>
  <tr>
    <td style="padding: 8px; color: #6b7280;">Limit</td>
    <td style="padding: 8px; font-weight: 600;">{{ limit_formatted }}</td>
  </tr>
  <tr>
    <td style="padding: 8px; color: #6b7280;">Plan</td>
    <td style="padding: 8px;">{{ plan_name }}</td>
  </tr>
</table>

{% if percent >= 95 %}
<p style="color: #dc2626;">
  ⚠️ You are approaching your limit. Uploads may be blocked soon.
</p>
{% endif %}

<a href="{{ dashboard_url }}/settings/billing" class="btn">
  View usage or upgrade plan
</a>
{% endblock %}
```

### 4.4 Template Renderer

```python
from jinja2 import Environment, FileSystemLoader

class TemplateRenderer:
    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader("app/services/notifications/templates"),
            autoescape=True,
        )

    def render(self, template_name: str, context: dict) -> tuple[str, str]:
        html = self.env.get_template(f"{template_name}.html").render(**context)
        text = self.env.get_template(f"{template_name}.txt").render(**context)
        return html, text
```

---

## 5. Notification Preferences

### 5.1 Preference Model

```python
class NotificationPreferences(BaseModel):
    # Email preferences per notification type
    email: dict[str, bool] = {
        "usage_alert_80": True,
        "usage_alert_95": True,       # Cannot disable
        "api_key_events": True,
        "security_alerts": True,      # Cannot disable
        "webhook_failures": True,
        "processing_failures": False,  # Off by default
        "compliance_events": True,    # Cannot disable
    }

    # In-app preferences
    in_app: dict[str, bool] = {
        "processing_failures": True,
        "usage_alerts": True,
        "security_alerts": True,
    }

    # Digest mode: instead of immediate emails, send daily digest
    digest_mode: bool = False
    digest_time_utc: int = 9  # Hour 0-23

# Stored per-user per-org in notification_preferences table
```

### 5.2 Mandatory Notifications

Some notifications cannot be disabled. These are checked in `NotificationService.send()` before checking preferences:

```python
MANDATORY_NOTIFICATION_TYPES = {
    "usage_alert_95",
    "usage_limit_reached",
    "api_key_revoked",
    "virus_detected",
    "legal_hold_placed",
    "gdpr_erasure_request",
    "baa_required",
    "security_breach",
}
```

---

## 6. Delivery Service

```python
class NotificationService:

    async def send(
        self,
        notification_type: str,
        org_id: str,
        context: dict,
        recipient_user_ids: list[str] | None = None,
    ) -> None:
        # Resolve recipients
        if recipient_user_ids is None:
            recipient_user_ids = await self._get_default_recipients(
                notification_type, org_id
            )

        for user_id in recipient_user_ids:
            user = await self.db.get(User, user_id)
            prefs = await self._get_preferences(user_id, org_id)

            should_email = (
                notification_type in MANDATORY_NOTIFICATION_TYPES
                or prefs.email.get(notification_type, True)
            )

            notification = Notification(
                id=new_id("notif"),
                org_id=org_id,
                user_id=user_id,
                notification_type=notification_type,
                context=context,
                created_at=datetime.utcnow(),
            )
            self.db.add(notification)

            if should_email and user.email:
                await self._queue_email(notification, user, context)

        await self.db.commit()

    async def _queue_email(
        self, notification: Notification, user: User, context: dict
    ) -> None:
        event = EmailNotificationEvent(
            notification_id=str(notification.id),
            to=user.email,
            notification_type=notification.notification_type,
            context=context,
        )
        await self.nats.publish(
            "filenest.internal.notifications.email",
            event.model_dump_json().encode(),
        )


class NotificationWorker:
    """Pull subscriber for notification delivery."""

    async def run(self) -> None:
        sub = await self.js.pull_subscribe(
            "filenest.internal.notifications.email",
            durable="notification-workers",
        )
        while True:
            messages = await sub.fetch(batch=20, timeout=2)
            for msg in messages:
                await self._deliver(msg)
                await msg.ack()

    async def _deliver(self, msg) -> None:
        event = EmailNotificationEvent.model_validate_json(msg.data)
        html, text = self.renderer.render(
            event.notification_type, event.context
        )
        email = EmailMessage(
            to=event.to,
            subject=self._subject(event.notification_type, event.context),
            html_body=html,
            text_body=text,
            notification_type=event.notification_type,
            org_id=event.context.get("org_id"),
        )
        message_id = await self.email_router.send(email)

        await self.db.execute(
            update(Notification)
            .where(Notification.id == event.notification_id)
            .values(email_sent_at=datetime.utcnow(), email_message_id=message_id)
        )

    def _subject(self, notification_type: str, context: dict) -> str:
        subjects = {
            "usage_alert_80": f"[FileNest] Storage usage at 80% — {context.get('org_name')}",
            "usage_alert_95": f"[FileNest] ⚠️ Storage usage at 95% — {context.get('org_name')}",
            "virus_detected": f"[FileNest] 🚨 Virus detected in uploaded file",
            "phi_detected": f"[FileNest] PHI detected in file — action required",
            "api_key_revoked": f"[FileNest] API key revoked — {context.get('key_prefix')}",
            "webhook_failures": f"[FileNest] Webhook delivery failing — {context.get('webhook_url')}",
            "legal_hold_placed": f"[FileNest] Legal hold placed on file",
            "gdpr_erasure_completed": f"[FileNest] GDPR erasure request completed",
            "team_invite": f"{context.get('inviter_name')} invited you to {context.get('org_name')} on FileNest",
            "welcome": f"Welcome to FileNest, {context.get('first_name')}!",
        }
        return subjects.get(notification_type, "[FileNest] Notification")
```

---

## 7. In-App Notifications

In-app notifications are read by the dashboard via a polling endpoint (v1) or WebSocket (v2).

```
GET /v1/notifications?unread=true&limit=20

Response:
{
  "data": [
    {
      "id": "notif_abc",
      "type": "virus_detected",
      "title": "Virus detected",
      "message": "A file 'invoice.exe' was quarantined after virus scan.",
      "severity": "critical",
      "read": false,
      "created_at": "2026-06-15T10:00:00Z",
      "action_url": "/projects/proj_abc/files/file_xyz"
    }
  ],
  "unread_count": 3
}

POST /v1/notifications/{id}/read
POST /v1/notifications/read-all
```

---

## 8. Database Schema

```sql
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    notification_type   TEXT NOT NULL,
    context             JSONB NOT NULL DEFAULT '{}',
    read                BOOLEAN NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    email_sent_at       TIMESTAMPTZ,
    email_message_id    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, read, created_at DESC)
    WHERE read = FALSE;

CREATE TABLE notification_preferences (
    user_id     UUID NOT NULL REFERENCES users(id),
    org_id      UUID NOT NULL REFERENCES organizations(id),
    preferences JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id)
);
```

---

## 9. API Endpoints

```
GET    /v1/notifications
GET    /v1/notifications/unread-count
POST   /v1/notifications/{id}/read
POST   /v1/notifications/read-all
GET    /v1/notification-preferences
PUT    /v1/notification-preferences
```

All notification endpoints require user authentication (session token), not API key authentication. They are dashboard-only endpoints.
