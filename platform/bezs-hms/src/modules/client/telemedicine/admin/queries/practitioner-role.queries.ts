/**
 * practitioner-role.queries — TanStack Query keys and fetchers for PractitionerRole data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * practitioner role data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: practitionerRoleKeys.all })` to
 * refresh every list regardless of page/size.
 *
 * Also backs the ReferenceSelect picker used by Schedule's
 * `practitioner_roles[]` actor sub-group via `searchPractitionerRoleOptions`
 * — fhir-gql's ListPractitionerRolesSchema has no name/text search filter, so
 * that fetcher (and the table's own initial-page fetch) both scope by org_id
 * server-side but filter/search client-side where needed.
 */

import {
  TPractitionerRoleResponse,
  TPaginatedPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

// ── Query key factory ──────────────────────────────────────────────────────────

export const practitionerRoleKeys = {
  /** Root key — invalidate this to wipe the entire practitioner role cache. */
  all: ["practitionerRoles"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...practitionerRoleKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...practitionerRoleKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of practitioner roles via the server action and returns
 * the paginated response. Throws on error so TanStack Query can handle
 * retries and error state.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @returns The paginated practitioner role response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchPractitionerRoles(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedPractitionerRoleResponse> {
  const [data, err] = await listPractitionerRolesAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load practitioner roles");
  return data!;
}

/**
 * Fetches every practitioner role for the given tenant by looping the list
 * action at the maximum page size until all pages are retrieved. Same
 * loop-until-exhausted pattern as `fetchAllLocations`/`fetchAllOrganizations`.
 *
 * @param orgId - Active organization ID to scope the fetch to the current tenant.
 * @returns Every practitioner role record for the tenant.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllPractitionerRoles(
  orgId: string | null,
): Promise<TPractitionerRoleResponse[]> {
  const PAGE_SIZE = 200;
  const all: TPractitionerRoleResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listPractitionerRolesAction({
      payload: { limit: PAGE_SIZE, offset, org_id: orgId ?? undefined },
    });
    if (err) throw new Error(err.message ?? "Failed to load practitioner roles");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches practitioner roles by practitioner name for the ReferenceSelect
 * picker, scoped to the given tenant. fhir-gql's list endpoint has no name
 * filter, so this reuses `fetchAllPractitionerRoles` and filters client-side.
 *
 * Label is composed as "{practitioner name} — {role}" when a role code is
 * present, since PractitionerRole itself has no name of its own.
 *
 * @param query - Search text; case-insensitive substring match on practitioner_display.
 * @param orgId - Active organization ID to scope results to the current tenant.
 * @returns Up to 50 matching practitioner roles as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchPractitionerRoleOptions(
  query: string,
  orgId: string | null,
): Promise<TReferenceOption[]> {
  const all = await fetchAllPractitionerRoles(orgId);
  const q = query.trim().toLowerCase();

  return all
    .filter((role) => !q || (role.practitioner_display ?? "").toLowerCase().includes(q))
    .slice(0, 50)
    .map((role) => {
      const name = role.practitioner_display ?? `PractitionerRole #${role.id}`;
      const roleLabel = role.code?.[0]?.coding_display;
      return { id: role.id, label: roleLabel ? `${name} — ${roleLabel}` : name };
    });
}
