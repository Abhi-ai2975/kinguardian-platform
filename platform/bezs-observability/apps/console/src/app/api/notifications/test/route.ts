// POST /api/notifications/test — sends a test in-app notification for the
// authenticated org. Used by the /notifications page "Send test" button.
// Calls the notifier's internal API server-side so the secret never reaches
// the browser.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

const notifierUrl = () => process.env.NOTIFIER_URL ?? "http://localhost:4004";
const internalSecret = () => process.env.NOTIFIER_INTERNAL_SECRET ?? "change-me";

const TEST_TEMPLATES = [
  {
    template: "alert_notification",
    channels: ["in_app"],
    data: {
      rule_name: "Test Alert Rule",
      severity: "warn",
      condition: "Error rate exceeded 5% in the last 5 minutes",
      fired_at: new Date().toISOString(),
      console_url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
    },
  },
  {
    template: "api_key_created",
    channels: ["in_app"],
    data: {
      key_name: "Test SDK Key",
      created_at: new Date().toISOString(),
      console_url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
    },
  },
  {
    template: "alert_notification",
    channels: ["in_app"],
    data: {
      rule_name: "High Token Cost",
      severity: "error",
      condition: "AI token spend exceeded $50 in the last hour",
      fired_at: new Date().toISOString(),
      console_url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
    },
  },
] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  // Rotate through templates so repeated clicks show different notifications.
  const body = await req.json().catch(() => ({}));
  const index = typeof body.index === "number" ? body.index % TEST_TEMPLATES.length : 0;
  const tpl = TEST_TEMPLATES[index];

  try {
    const res = await fetch(`${notifierUrl()}/api/internal/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret(),
      },
      body: JSON.stringify({ org_id: orgId, ...tpl }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[/api/notifications/test]", res.status, text);
      return NextResponse.json(
        { error: "Notifier returned an error — is it running?" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, template: tpl.template });
  } catch (err) {
    console.error("[/api/notifications/test]", err);
    return NextResponse.json(
      { error: "Could not reach the notifier service — run `just notifier-dev`" },
      { status: 503 },
    );
  }
}
