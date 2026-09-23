/**
 * location.queries — TanStack Query keys and fetchers for Location data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * location data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: locationKeys.all })` to refresh
 * every list regardless of page/size.
 */

import {
  TLocationResponse,
  TPaginatedLocationResponse,
} from "@/modules/entities/schemas/location";
import { listLocationsAction } from "@/modules/server/presentation/actions/location";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for Location queries.
 *
 * Hierarchy:
 *   all                              → invalidates everything location-related
 *   lists                            → invalidates all paginated list queries
 *   list({ pageIndex, pageSize })    → invalidates one specific page
 *   allForOrg(orgId)                 → invalidates the "fetch every location" query,
 *                                       shared by the hierarchy view and the
 *                                       part_of combobox
 */
export const locationKeys = {
  /** Root key — invalidate this to wipe the entire location cache. */
  all: ["locations"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...locationKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...locationKeys.lists(), params] as const,

  /**
   * Key for the "fetch every location for this tenant" query — shared by the
   * Location Hierarchy view and the part_of combobox (Location's list endpoint
   * has no name filter, so both need the full flat list to filter client-side).
   */
  allForOrg: (orgId: string | null) => [...locationKeys.all, "all", orgId] as const,
};

// ── Fetchers ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of locations via the server action and returns the
 * paginated response. Throws on error so TanStack Query can handle retries
 * and error state.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @returns The paginated location response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchLocations(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedLocationResponse> {
  const [data, err] = await listLocationsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load locations");
  return data!;
}

/**
 * Fetches every location for the given tenant by looping the list action at
 * the maximum page size until all pages are retrieved. There is no
 * server-side "get all" or tree endpoint for Location, so hierarchy building
 * and the part_of combobox both need the complete flat list.
 *
 * @param orgId - Active organization ID to scope the fetch to the current tenant.
 * @returns Every location record for the tenant.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllLocations(
  orgId: string | null,
): Promise<TLocationResponse[]> {
  const PAGE_SIZE = 200;
  const all: TLocationResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listLocationsAction({
      payload: { limit: PAGE_SIZE, offset, org_id: orgId ?? undefined },
    });
    if (err) throw new Error(err.message ?? "Failed to load locations");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches locations by name for the ReferenceSelect picker, scoped to the
 * given tenant. fhir-gql's Location list endpoint has no server-side name
 * filter, so this reuses `fetchAllLocations` and filters client-side —
 * consistent with how the Location Hierarchy view already sources its data.
 *
 * @param query     - Search text; case-insensitive substring match on name.
 * @param orgId     - Active organization ID to scope results to the current tenant.
 * @param excludeId - Optional record id to omit (e.g. a record editing itself
 *                    should not be offered as its own parent).
 * @returns Up to 50 matching locations as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchLocationOptions(
  query: string,
  orgId: string | null,
  excludeId?: number,
): Promise<TReferenceOption[]> {
  const all = await fetchAllLocations(orgId);
  const q = query.trim().toLowerCase();

  return all
    .filter((loc) => loc.id !== excludeId)
    .filter((loc) => !q || (loc.name ?? "").toLowerCase().includes(q))
    .slice(0, 50)
    .map((loc) => ({ id: loc.id, label: loc.name ?? `Location #${loc.id}` }));
}
