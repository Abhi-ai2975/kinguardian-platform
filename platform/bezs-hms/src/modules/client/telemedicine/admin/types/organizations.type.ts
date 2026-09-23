/**
 * Client-layer TypeScript types for the Organizations admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table and detail components. Separating these here keeps
 * component files free of import-heavy type declarations.
 */

import { ZSAError } from "zsa";
import {
  TOrgResponse,
  TPaginatedOrgResponse,
} from "@/modules/entities/schemas/organization";

/** Row type used by OrganizationsTable and OrganizationsTableColumn. */
export type TOrganization = TOrgResponse;

/** Props for the main Organizations table component. */
export interface IOrganizationsTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedOrgResponse;
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
