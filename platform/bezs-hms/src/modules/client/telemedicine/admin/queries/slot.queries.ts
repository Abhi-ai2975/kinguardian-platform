/**
 * slot.queries — TanStack Query keys and fetcher for Slot data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * slot data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: slotKeys.all })` to refresh
 * every list regardless of page/size.
 */

import { TPaginatedSlotResponse } from "@/modules/entities/schemas/slot";
import { listSlotsAction } from "@/modules/server/presentation/actions/slot";

// ── Query key factory ──────────────────────────────────────────────────────────

export const slotKeys = {
  /** Root key — invalidate this to wipe the entire slot cache. */
  all: ["slots"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...slotKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...slotKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of slots via the server action and returns the paginated
 * response. Throws on error so TanStack Query can handle retries and error
 * state.
 *
 * Unlike Schedule, Slot's ListSlotsSchema has real user_id/org_id filters —
 * results are server-side tenant-scoped by org_id.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @returns The paginated slot response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchSlots(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedSlotResponse> {
  const [data, err] = await listSlotsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load slots");
  return data!;
}
