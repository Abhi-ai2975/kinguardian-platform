/**
 * Client-layer TypeScript types for the Slots admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table components. Separating these here keeps component
 * files free of import-heavy type declarations.
 */

import {
  TSlotResponse,
  TPaginatedSlotResponse,
} from "@/modules/entities/schemas/slot";

/** Row type used by SlotsTable and SlotsTableColumn. */
export type TSlot = TSlotResponse;

/** Props for the main Slots table component. */
export interface ISlotsTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedSlotResponse;
  /**
   * Active organization ID from the session (Better Auth `activeOrganizationId`).
   * Unlike Schedule, Slot's list endpoint has a real org_id filter — results
   * are server-side tenant-scoped.
   */
  orgId: string | null;
  /**
   * Authenticated user's ID from the session (Better Auth `user.id`).
   * Forwarded to the create/generate modals so it can be stamped on newly
   * created resources as `user_id`.
   */
  userId: string | null;
}
