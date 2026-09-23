/**
 * POST /api/workflow/dynamic-select
 *
 * Layer: app / api / workflow / dynamic-select
 *
 * Server-side proxy for the DynamicSelect A2UI catalog component. The component
 * runs in the browser and cannot reach the FHIR server directly, so it calls this
 * route instead. The route:
 *   1. Resolves the URL template (e.g. "$fhir_gql_url/practitioners/")
 *      using the FHIR_GQL_URL env var — the same logic used by other workflow routes.
 *   2. Validates the resolved URL against the allowed FHIR origin to prevent SSRF.
 *   3. Appends caller-supplied query params (static context values + live search term).
 *   4. Makes an authenticated GET with a short-lived Bearer JWT.
 *   5. Extracts the items array from the response using the caller's responsePath,
 *      then returns { items: unknown[] }.
 *
 * Note: Only $fhir_gql_url is resolved in the URL template because the session
 * context is client-side. Dynamic path segments (e.g. $patient_id) should be
 * passed via staticParams in the schema instead.
 */

import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { resolveUrl } from "../_lib";

/** FHIR base URL used for SSRF validation. Mirrors what resolveUrl injects. */
const FHIR_BASE = (process.env.FHIR_GQL_URL ?? "").replace(/\/$/, "");

/**
 * Traverses a dot-separated path (e.g. "data" or "results.items") into a JSON value.
 *
 * @param obj  - The parsed JSON response body.
 * @param path - Dot-notation path. Empty string means return the root value.
 * @returns The nested value, or undefined when the path does not exist.
 */
function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    if (Array.isArray(acc)) {
      const idx = parseInt(key, 10);
      return isNaN(idx) ? undefined : acc[idx];
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Proxies a DynamicSelect search query to the FHIR server.
 *
 * @param req - POST request with JSON body { url, params, responsePath }.
 * @returns JSON { items: unknown[] } or an error response.
 */
export async function POST(req: Request) {
  let body: {
    url?: string;
    params?: Record<string, string>;
    responsePath?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, params = {}, responsePath = "" } = body;

  if (!url) {
    return Response.json({ error: "'url' is required" }, { status: 400 });
  }

  // Resolve $fhir_gql_url placeholder; unknown $vars become empty string.
  const resolved = resolveUrl(url, {});
  console.log({ url, resolved });
  // SSRF guard: only proxy requests to the configured FHIR server origin.
  if (FHIR_BASE && !resolved.startsWith(FHIR_BASE)) {
    return Response.json({ error: "URL not allowed" }, { status: 403 });
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch {
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  // Build the query string from the caller-supplied params (static + search term).
  const qs = new URLSearchParams(params).toString();
  const fetchUrl = qs ? `${resolved}?${qs}` : resolved;

  try {
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { error: `Upstream error: ${res.status}` },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();

    // Extract the items array from the response using the schema-declared path.
    // An empty responsePath means the root of the response is the array itself.
    const extracted = resolvePath(data, responsePath);
    const items = Array.isArray(extracted) ? extracted : [];

    return Response.json({ items });
  } catch (error) {
    console.error("[workflow/dynamic-select] Fetch failed:", error);
    return Response.json({ error: "Search request failed" }, { status: 500 });
  }
}
