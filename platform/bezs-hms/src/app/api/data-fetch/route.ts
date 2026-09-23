/**
 * POST /api/data-fetch
 *
 * Layer: app / api / data-fetch
 *
 * Generic server-side proxy used by A2UI DataTable components to fetch
 * paginated / filtered data from the FHIR server with Bearer auth.
 * Keeps the token and FHIR base URL out of the browser entirely.
 *
 * Request body:
 *   {
 *     url:          string,                     // absolute URL or path (auto-prefixed with FHIR_SERVER_URL)
 *     queryParams?: Record<string, unknown>,    // appended as query string
 *     dataPath?:    string,                     // dot-path to the row array  e.g. "entry", "data.items"
 *     totalPath?:   string,                     // dot-path to the total count e.g. "total", "meta.total"
 *   }
 *
 * Response:
 *   { rows: unknown[], total: number, raw: unknown }
 */

import { getAuthToken as getJWTToken } from "@/modules/server/auth/jwt-token";

/**
 * Traverses a dot-notation path on an object.
 *
 * @param obj  - Source object.
 * @param path - Dot-separated key path e.g. "meta.total".
 * @returns The value at the path, or undefined if any segment is missing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAtPath(obj: any, path: string): any {
  if (!path) return obj;
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

/**
 * Extracts the row array from the API response.
 * Tries `dataPath` first, then a list of common key names.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows(raw: any, dataPath?: string): unknown[] {
  if (dataPath) {
    const val = getAtPath(raw, dataPath);
    return Array.isArray(val) ? val : [];
  }
  if (Array.isArray(raw)) return raw;
  for (const key of ["data", "items", "results", "entry", "records", "rows"]) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
}

/**
 * Extracts the total count from the API response.
 * Tries `totalPath` first, then common key names and nested meta fields.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTotal(raw: any, totalPath?: string, rowCount = 0): number {
  if (totalPath) {
    const val = getAtPath(raw, totalPath);
    return typeof val === "number" ? val : Number(val) || rowCount;
  }
  for (const key of ["total", "count", "totalCount", "total_count"]) {
    if (typeof raw?.[key] === "number") return raw[key];
  }
  return getAtPath(raw, "meta.total") ?? getAtPath(raw, "meta.count") ?? rowCount;
}

/**
 * Fetches data from the FHIR server and normalises the response to rows + total.
 *
 * @param req - POST request with { url, queryParams?, dataPath?, totalPath? } body.
 * @returns Normalised { rows, total, raw } response.
 */
export async function POST(req: Request) {
  const { url, queryParams = {}, dataPath, totalPath } = await req.json();

  if (!url) {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  const token = await getJWTToken();

  // Relative paths are prefixed with FHIR_SERVER_URL automatically.
  const resolvedUrl = url.startsWith("/")
    ? `${process.env.FHIR_SERVER_URL ?? ""}${url}`
    : url;

  const params = new URLSearchParams(
    Object.entries(queryParams as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );

  const fullUrl = params.toString() ? `${resolvedUrl}?${params}` : resolvedUrl;

  const upstream = await fetch(fullUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!upstream.ok) {
    return Response.json(
      { error: `Upstream error: ${upstream.status} ${upstream.statusText}` },
      { status: upstream.status },
    );
  }

  const raw = await upstream.json();
  const rows = extractRows(raw, dataPath);
  const total = extractTotal(raw, totalPath, rows.length);

  return Response.json({ rows, total, raw });
}
