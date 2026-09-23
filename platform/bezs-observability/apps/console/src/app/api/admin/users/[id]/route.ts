// PATCH /api/admin/users/[id] — ban, unban, set-role, revoke-sessions actions.
// DELETE /api/admin/users/[id] — permanently remove a user account.
// Both proxy the operation to IAM's Better Auth admin API.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  banUser,
  unbanUser,
  setUserRole,
  removeUser,
  revokeUserSessions,
} from "@/lib/iam-admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    action: "ban" | "unban" | "set-role" | "revoke-sessions";
    role?: string;
    banReason?: string;
  };

  try {
    switch (body.action) {
      case "ban":
        await banUser(id, body.banReason);
        break;
      case "unban":
        await unbanUser(id);
        break;
      case "set-role":
        if (!body.role) return NextResponse.json({ error: "role required" }, { status: 400 });
        await setUserRole(id, body.role);
        break;
      case "revoke-sessions":
        await revokeUserSessions(id);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await removeUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
