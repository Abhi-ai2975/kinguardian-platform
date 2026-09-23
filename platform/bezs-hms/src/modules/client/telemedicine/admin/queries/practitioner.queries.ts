/**
 * practitioner.queries — TanStack Query keys and fetchers for Practitioner data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * practitioner data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: practitionerKeys.all })` to
 * refresh every list regardless of page/size.
 *
 * Also backs the ReferenceSelect picker used by PractitionerRole's
 * top-level `practitioner` field via `searchPractitionerOptions` —
 * fhir-gql's ListPractitionersSchema has `family_name`/`given_name` filters
 * but no single combined-name search matching a free-text query, so that
 * fetcher (and `practitionerLabel`, reused by the table's identity column)
 * fetch the tenant's full list once and filter/compose client-side.
 */

import { TPractitionerResponse, TPaginatedPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionersAction } from "@/modules/server/presentation/actions/practitioner";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

/** Composes a display label from a Practitioner's first HumanName record. */
export function practitionerLabel(practitioner: TPractitionerResponse): string {
  const primaryName = practitioner.name?.[0];
  if (!primaryName) return `Practitioner #${practitioner.id}`;
  return (
    primaryName.text ??
    [primaryName.given?.join(" "), primaryName.family].filter(Boolean).join(" ") ??
    `Practitioner #${practitioner.id}`
  );
}

// ── Query key factory ──────────────────────────────────────────────────────────

export const practitionerKeys = {
  /** Root key — invalidate this to wipe the entire practitioner cache. */
  all: ["practitioners"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...practitionerKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...practitionerKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of practitioners via the server action and returns the
 * paginated response. Throws on error so TanStack Query can handle retries
 * and error state.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @returns The paginated practitioner response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchPractitioners(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedPractitionerResponse> {
  const [data, err] = await listPractitionersAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load practitioners");
  return data!;
}

/**
 * Fetches every practitioner for the given tenant by looping the list action
 * at the maximum page size until all pages are retrieved. Same
 * loop-until-exhausted pattern as `fetchAllLocations`/`fetchAllOrganizations`.
 *
 * @param orgId - Active organization ID to scope the fetch to the current tenant.
 * @returns Every practitioner record for the tenant.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllPractitioners(
  orgId: string | null,
): Promise<TPractitionerResponse[]> {
  const PAGE_SIZE = 200;
  const all: TPractitionerResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listPractitionersAction({
      payload: { limit: PAGE_SIZE, offset, org_id: orgId ?? undefined },
    });
    if (err) throw new Error(err.message ?? "Failed to load practitioners");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches practitioners by name for the ReferenceSelect picker, scoped to
 * the given tenant. Reuses `fetchAllPractitioners` and filters client-side
 * against the composed display name.
 *
 * @param query - Search text; case-insensitive substring match on the composed name.
 * @param orgId - Active organization ID to scope results to the current tenant.
 * @returns Up to 50 matching practitioners as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchPractitionerOptions(
  query: string,
  orgId: string | null,
): Promise<TReferenceOption[]> {
  const all = await fetchAllPractitioners(orgId);
  const q = query.trim().toLowerCase();

  return all
    .filter((p) => !q || practitionerLabel(p).toLowerCase().includes(q))
    .slice(0, 50)
    .map((p) => ({ id: p.id, label: practitionerLabel(p) }));
}
