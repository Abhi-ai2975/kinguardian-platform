/**
 * schedule.queries — TanStack Query keys and fetcher for Schedule data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * schedule data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: scheduleKeys.all })` to refresh
 * every list regardless of page/size.
 */

import {
  TPaginatedScheduleResponse,
  TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { listSchedulesAction } from "@/modules/server/presentation/actions/schedule";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

// ── Query key factory ──────────────────────────────────────────────────────────

export const scheduleKeys = {
  /** Root key — invalidate this to wipe the entire schedule cache. */
  all: ["schedules"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...scheduleKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache
   * entry, even though it is not forwarded to the action payload (see fetcher).
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...scheduleKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of schedules via the server action and returns the
 * paginated response. Throws on error so TanStack Query can handle retries
 * and error state.
 *
 * fhir-gql's ListSchedulesSchema has no org_id/user_id filter at all — unlike
 * Location, results here are not server-side tenant-scoped. `orgId` is only
 * used as a cache-key discriminator, never forwarded to the action payload.
 *
 * @param params - Pagination params forwarded to the list action.
 * @returns The paginated schedule response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchSchedules(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedScheduleResponse> {
  const [data, err] = await listSchedulesAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load schedules");
  return data!;
}

/**
 * Fetches every schedule by looping the list action at the maximum page
 * size until all pages are retrieved. Same loop-until-exhausted pattern as
 * `fetchAllLocations`/`fetchAllOrganizations` — but unlike those, this is
 * NOT tenant-scoped (fhir-gql's ListSchedulesSchema has no org_id filter at
 * all), so it pulls every schedule across every tenant.
 *
 * @returns Every schedule record.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllSchedules(): Promise<TScheduleResponse[]> {
  const PAGE_SIZE = 200;
  const all: TScheduleResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listSchedulesAction({
      payload: { limit: PAGE_SIZE, offset },
    });
    if (err) throw new Error(err.message ?? "Failed to load schedules");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches schedules by comment for the ReferenceSelect picker. Schedule has
 * no name field — `comment` is the closest thing to a display label, and
 * falls back to `Schedule #{id}` when empty so every record stays pickable.
 *
 * Not tenant-scoped — see `fetchAllSchedules`. Still a strict UX upgrade over
 * blind free-text reference entry, which had the same lack of isolation.
 *
 * @param query - Search text; case-insensitive substring match on comment.
 * @returns Up to 50 matching schedules as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchScheduleOptions(query: string): Promise<TReferenceOption[]> {
  const all = await fetchAllSchedules();
  const q = query.trim().toLowerCase();

  return all
    .filter((sch) => !q || (sch.comment ?? `Schedule #${sch.id}`).toLowerCase().includes(q))
    .slice(0, 50)
    .map((sch) => ({ id: sch.id, label: sch.comment || `Schedule #${sch.id}` }));
}
