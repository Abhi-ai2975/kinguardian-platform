/**
 * Client-layer TypeScript types for the Schedules admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table components. Separating these here keeps component
 * files free of import-heavy type declarations.
 */

import {
  TScheduleResponse,
  TPaginatedScheduleResponse,
} from "@/modules/entities/schemas/schedule";

/** Row type used by SchedulesTable and SchedulesTableColumn. */
export type TSchedule = TScheduleResponse;

/** Props for the main Schedules table component. */
export interface ISchedulesTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedScheduleResponse;
  /**
   * Authenticated user's ID from the session (Better Auth `user.id`).
   * Forwarded to the create modal so it can be stamped on newly created
   * schedules as `user_id`.
   */
  userId: string | null;
  /**
   * Active organization ID from the session (Better Auth `activeOrganizationId`).
   * Forwarded to the create modal so it can be stamped as `org_id`. NOT used
   * to filter the list — fhir-gql's ListSchedulesSchema has no org_id filter
   * at all (unlike Location/HealthcareService), so results are not
   * server-side tenant-scoped here.
   */
  orgId: string | null;
}
