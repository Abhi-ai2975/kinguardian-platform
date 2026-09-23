/**
 * Client-layer TypeScript types for the Locations admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table components. Separating these here keeps component
 * files free of import-heavy type declarations.
 */

import {
  TLocationResponse,
  TPaginatedLocationResponse,
} from "@/modules/entities/schemas/location";

/** Row type used by LocationsTable and LocationsTableColumn. */
export type TLocation = TLocationResponse;

/** Props for the main Locations table component. */
export interface ILocationsTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedLocationResponse;
  /**
   * Active organization ID from the session (Better Auth `activeOrganizationId`).
   * Passed to every list fetch so results are scoped to the current tenant.
   */
  orgId: string | null;
  /**
   * Authenticated user's ID from the session (Better Auth `user.id`).
   * Forwarded to the create/edit modals via the admin store so it can be
   * stamped on newly created resources as `user_id`.
   */
  userId: string | null;
}
