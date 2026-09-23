/**
 * POST /api/filenest-token
 *
 * Layer: presentation / API route
 *
 * Generates a short-lived FileNest upload token for use by the browser-side
 * @filenest-fs/react SDK. The token scopes the upload to a folder so files land
 * in the right place without exposing the API key to the client.
 *
 * Folder lookup strategy: `getByPath` is attempted first — if the path already
 * exists the existing folder is reused with no extra write. Only when the path
 * is absent does `ensurePath` run to create the missing segments.
 *
 * Request body (JSON):
 *   filePath         — string                 — full nested folder path, e.g. "1234/profile".
 *                      When present this takes precedence over the patientFhirId/folder query params.
 *   allowedMimeTypes — string[]               — defaults to standard image types
 *   maxSize          — number (bytes)          — defaults to 5 MB
 *   maxFiles         — number                  — defaults to 1
 *   metadata         — Record<string,unknown>  — embedded in every uploaded file record
 *   userId           — string                  — overrides the session user id as ownerUserId
 *   orgId            — string                  — overrides the session org id as ownerOrgId
 *
 * Query params (legacy fallback when filePath is absent from body):
 *   patientFhirId — optional numeric FHIR patient ID
 *   folder        — optional subfolder name (default "profile")
 *
 * Response: UploadToken { token, expiresAt, constraints }
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import { filenest } from "@/lib/filenest.server";

/** Shape of the optional JSON body the client may send. */
interface TokenRequestBody {
  /** Full nested folder path, e.g. "1234/profile". Takes precedence over query params. */
  filePath?: string;
  allowedMimeTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
  metadata?: Record<string, unknown>;
  /** Overrides the session user id as ownerUserId on the upload token. */
  userId?: string;
  /** Overrides the session org id as ownerOrgId on the upload token. */
  orgId?: string;
}

export async function POST(req: Request): Promise<Response> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUserId = session.user.id;
  const sessionOrgId = session.session.activeOrganizationId ?? "";

  // ── Request body — folder path + token constraints + metadata ───────────
  // FileNestProvider sends body: {} by default (tokenEndpoint mode).
  // The a2ui FileUpload component uses tokenFetcher to POST the full body.
  let body: TokenRequestBody = {};
  try {
    body = (await req.json()) as TokenRequestBody;
  } catch {
    // Empty or non-JSON body — fall through to defaults below.
  }

  const allowedMimeTypes = body.allowedMimeTypes ?? [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  const maxSize = body.maxSize ?? 5 * 1024 * 1024; // 5 MB
  const maxFiles = body.maxFiles ?? 1;
  const metadata = body.metadata ?? {};
  // Body values take precedence; fall back to session-derived values.
  const userId = body.userId ?? sessionUserId;
  const orgId = body.orgId ?? sessionOrgId;

  // ── Resolve folder path ───────────────────────────────────────────────────
  // Priority 1 — filePath from body: full nested path, e.g. "10000/servicerequest/xray".
  //              Used by the a2ui FileUpload component for arbitrary resource hierarchies.
  // Priority 2 — legacy query params: patientFhirId + folder subfolder name.
  //              Used by PatientProfileForm via tokenEndpoint (sends body: {}).
  let folderPath: string;

  if (body.filePath) {
    folderPath = body.filePath;
  } else {
    const { searchParams } = new URL(req.url);
    const patientFhirIdParam = searchParams.get("patientFhirId");
    const patientFhirId = patientFhirIdParam ? Number(patientFhirIdParam) : null;
    const folder = searchParams.get("folder") ?? "profile";
    const rootSegment =
      patientFhirId != null ? `${patientFhirId}-${userId}` : userId;
    folderPath = `${rootSegment}/${folder}`;
  }

  // getByPath should return null on 404 but the SDK checks `.status` while the
  // error object carries `.statusCode` — so it rethrows. Catch 404 explicitly
  // and treat it as "folder absent" so we fall through to ensurePath.
  let uploadFolder;
  try {
    uploadFolder = await filenest.folders.getByPath(folderPath);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      uploadFolder = null;
    } else {
      throw err;
    }
  }

  if (!uploadFolder) {
    uploadFolder = await filenest.folders.ensurePath(folderPath);
  }

  // ── Generate scoped upload token ──────────────────────────────────────────
  const token = await filenest.uploadTokens.create({
    folderId: uploadFolder.id,
    allowedMimeTypes,
    maxSize,
    maxFiles,
    expiresIn: 600, // 10 minutes
    ownerUserId: userId,
    ownerOrgId: orgId,
    tags: [],
    metadata,
  });

  return Response.json(token);
}
