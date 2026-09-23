/**
 * healthcare-service.queries — TanStack Query keys and fetcher for HealthcareService data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * healthcare service data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: healthcareServiceKeys.all })`
 * to refresh every list regardless of page/size.
 */

import {
  TPaginatedHealthcareServiceResponse,
  THealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { listHealthcareServicesAction } from "@/modules/server/presentation/actions/healthcare-service";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

// ── Query key factory ──────────────────────────────────────────────────────────

export const healthcareServiceKeys = {
  /** Root key — invalidate this to wipe the entire healthcare service cache. */
  all: ["healthcareServices"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...healthcareServiceKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...healthcareServiceKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of healthcare services via the server action and returns
 * the paginated response. Throws on error so TanStack Query can handle
 * retries and error state.
 *
 * Unlike Location, HealthcareService's list endpoint has a real `name`
 * filter (matches Organization's contract) — but no `org_id` filter exists
 * server-side, so `orgId` is only used as a cache-key discriminator here,
 * not forwarded to the action payload.
 *
 * @param params - Pagination params forwarded to the list action.
 * @returns The paginated healthcare service response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchHealthcareServices(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedHealthcareServiceResponse> {
  const [data, err] = await listHealthcareServicesAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load healthcare services");
  return data!;
}

/**
 * Searches healthcare services by name for the ReferenceSelect picker.
 * fhir-gql's ListHealthcareServicesValidationSchema has a real server-side
 * `name` filter, so this searches live rather than fetching the full list.
 * There is no org_id filter on this endpoint — results are NOT tenant-scoped,
 * the same pre-existing gap the healthcare services list screen has.
 *
 * @param query - Search text; empty string returns the first page.
 * @returns Up to 50 matching healthcare services as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchHealthcareServiceOptions(
  query: string,
): Promise<TReferenceOption[]> {
  const [data, err] = await listHealthcareServicesAction({
    payload: {
      name: query || undefined,
      limit: 50,
      offset: 0,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to search healthcare services");
  if (!data) return [];

  return data.data.map((hs: THealthcareServiceResponse) => ({
    id: hs.id,
    label: hs.name ?? `Healthcare Service #${hs.id}`,
  }));
}
