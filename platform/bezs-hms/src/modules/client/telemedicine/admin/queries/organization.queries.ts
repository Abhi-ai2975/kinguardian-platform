/**
 * organization.queries — TanStack Query keys and fetcher for Organization data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * organization data reference the same key shape — no string literals scattered
 * across files. Mutations call `queryClient.invalidateQueries({ queryKey:
 * organizationKeys.all })` to refresh every list regardless of page/size.
 */

import {
  TOrgResponse,
  TPaginatedOrgResponse,
} from "@/modules/entities/schemas/organization";
import { listOrganizationsAction } from "@/modules/server/presentation/actions/organization";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for Organization queries.
 *
 * Hierarchy:
 *   all                          → invalidates everything org-related
 *   lists                        → invalidates all list queries
 *   list({ pageIndex, pageSize }) → invalidates one specific page
 *
 * @example
 * // Invalidate every org query after a mutation:
 * queryClient.invalidateQueries({ queryKey: organizationKeys.all })
 *
 * // Invalidate just the list queries:
 * queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
 */
export const organizationKeys = {
  /** Root key — invalidate this to wipe the entire org cache. */
  all: ["organizations"] as const,

  /** Parent key for all list queries. */
  lists: () => [...organizationKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   * @param params - Pagination params + tenant org ID.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...organizationKeys.lists(), params] as const,

  /**
   * Key for the "fetch every organization for this tenant" query — used by
   * the Organization Hierarchy view, which needs the full flat list to build
   * a tree client-side (fhir-gql has no children/tree endpoint).
   */
  allForOrg: (orgId: string | null) => [...organizationKeys.all, "all", orgId] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of organizations via the server action and returns the
 * paginated response. Throws on error so TanStack Query can handle retries
 * and error state.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @param params.pageIndex - Zero-based page index.
 * @param params.pageSize  - Number of rows per page.
 * @param params.orgId     - Active organization ID to scope results to the current tenant.
 * @returns The paginated org response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchOrganizations(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedOrgResponse> {
  const [data, err] = await listOrganizationsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      // Scope results to the current tenant; undefined is omitted by axios.
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load organizations");
  return data!;
}

/**
 * Fetches every organization for the given tenant by looping the list action
 * at the maximum page size until all pages are retrieved. There is no
 * server-side "get all" or tree endpoint for Organization, so the hierarchy
 * view needs the complete flat list.
 *
 * @param orgId - Active organization ID to scope the fetch to the current tenant.
 * @returns Every organization record for the tenant.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllOrganizations(
  orgId: string | null,
): Promise<TOrgResponse[]> {
  const PAGE_SIZE = 200;
  const all: TOrgResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listOrganizationsAction({
      payload: { limit: PAGE_SIZE, offset, org_id: orgId ?? undefined },
    });
    if (err) throw new Error(err.message ?? "Failed to load organizations");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches organizations by name for the ReferenceSelect picker, scoped to
 * the given tenant. fhir-gql's ListOrgsValidationSchema has a real server-side
 * `name` filter, so this searches live rather than fetching the full list.
 *
 * @param query    - Search text; empty string returns the tenant's first page.
 * @param orgId    - Active organization ID to scope results to the current tenant.
 * @param excludeId - Optional record id to omit (e.g. a record editing itself
 *                    should not be offered as its own parent).
 * @returns Up to 50 matching organizations as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchOrganizationOptions(
  query: string,
  orgId: string | null,
  excludeId?: number,
): Promise<TReferenceOption[]> {
  const [data, err] = await listOrganizationsAction({
    payload: {
      name: query || undefined,
      org_id: orgId ?? undefined,
      limit: 50,
      offset: 0,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to search organizations");
  if (!data) return [];

  return data.data
    .filter((org: TOrgResponse) => org.id !== excludeId)
    .map((org: TOrgResponse) => ({ id: org.id, label: org.name ?? `Organization #${org.id}` }));
}
