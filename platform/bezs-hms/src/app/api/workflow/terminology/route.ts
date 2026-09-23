/**
 * GET /api/workflow/terminology
 *
 * Layer: app / api / workflow / terminology
 *
 * Server-side proxy for FHIR terminology concept search. Used by the
 * TerminologySelect A2UI component when server-side search is configured.
 * Injects the FHIR base URL and Bearer token so neither leaks to the client.
 *
 * Mode A — field concepts (small-to-large HL7 value sets):
 *   ?resource=Location&field=type&query=hosp&limit=20&offset=0
 *
 * Mode B — system search (LOINC, ICD-10, SNOMED CT, RxNorm):
 *   ?system=http://loinc.org&query=heart+failure
 *   ?query=diabetes  (omit system to search all loaded systems)
 *
 * Mode A returns: { concepts, total, limit, offset }
 * Mode B returns: { concepts }
 */

const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL!;

/** Default page size for Mode A paginated fetches. */
const DEFAULT_LIMIT = 20;

/**
 * Proxies terminology concept lookups to the FHIR server with Bearer auth.
 *
 * @param req - Incoming GET request with search params.
 * @returns JSON with { concepts, total?, limit?, offset? }.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource");
  const field    = searchParams.get("field");
  const system   = searchParams.get("system");
  const query    = searchParams.get("query") ?? "";
  const limit    = Math.min(Number(searchParams.get("limit") ?? DEFAULT_LIMIT), 100);
  const offset   = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  // Mode B: system-level full-text search (LOINC / ICD-10 / SNOMED / RxNorm)
  const isSystemSearch = system !== null || (!resource && !field && query);

  if (!isSystemSearch && (!resource || !field)) {
    return Response.json(
      { error: "Provide either (resource + field) or system" },
      { status: 400 },
    );
  }

  try {
    if (isSystemSearch) {
      // Mode B — no pagination support yet, keep existing behaviour
      const params = new URLSearchParams({ q: query, limit: "20" });
      if (system) params.set("system", system);

      const res = await fetch(
        `${FHIR_SERVER_URL}/api/v1/terminology/search?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Terminology search error: ${res.status}`);
      const data = await res.json();
      const concepts = Array.isArray(data.data) ? data.data : [];
      return Response.json({ concepts });
    }

    // Mode A — field value set with pagination
    const params = new URLSearchParams({
      resource: resource!,
      field: field!,
      limit: String(limit),
      offset: String(offset),
    });
    if (query) params.set("q", query);

    const res = await fetch(
      `${FHIR_SERVER_URL}/api/v1/terminology/concepts?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Terminology concepts error: ${res.status}`);
    const data = await res.json();

    return Response.json({
      concepts: Array.isArray(data.concepts) ? data.concepts : [],
      total:  data.total  ?? 0,
      limit:  data.limit  ?? limit,
      offset: data.offset ?? offset,
    });
  } catch (error) {
    console.error("[workflow/terminology] Failed:", error);
    return Response.json({ error: "Failed to fetch terminology" }, { status: 500 });
  }
}
