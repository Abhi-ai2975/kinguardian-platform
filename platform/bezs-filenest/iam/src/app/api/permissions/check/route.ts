import { NextRequest, NextResponse } from "next/server";
import { getUserPermissions } from "@/modules/server/utils/getUserPermissions";

// ------------------------------------------------------------------ //
// POST /api/permissions/check
//
// Server-to-server endpoint. Callers must supply the shared secret:
//   Authorization: Bearer <INTERNAL_API_KEY>
//
// Body:
//   { userId: string, organizationId: string, permission: string }
//   permission format: "resource:action"  e.g. "patient:create"
//
// Response 200:
//   { allowed: boolean, userId, organizationId, permission }
// ------------------------------------------------------------------ //

interface RequestBody {
  userId: string;
  organizationId: string;
  permission: string;
}

export async function POST(req: NextRequest) {
  // --- Auth ---
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json(
      { error: "Permission check endpoint is not configured" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== internalKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse body ---
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, organizationId, permission } = body;

  if (
    typeof userId !== "string" ||
    !userId ||
    typeof organizationId !== "string" ||
    !organizationId ||
    typeof permission !== "string" ||
    !permission
  ) {
    return NextResponse.json(
      { error: "userId, organizationId, and permission are required" },
      { status: 400 },
    );
  }

  // permission must be "resource:action"
  if (!permission.includes(":")) {
    return NextResponse.json(
      { error: 'permission must be in "resource:action" format' },
      { status: 400 },
    );
  }

  // --- Check ---
  const permSet = await getUserPermissions(userId, organizationId);
  const allowed = permSet.has(permission);

  return NextResponse.json({ allowed, userId, organizationId, permission });
}
