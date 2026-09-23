/**
 * Client-layer TypeScript types for the PractitionerRoles admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table components. Separating these here keeps component
 * files free of import-heavy type declarations.
 */

import {
  TPractitionerRoleResponse,
  TPaginatedPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";

/** Row type used by PractitionerRolesTable and PractitionerRolesTableColumn. */
export type TPractitionerRole = TPractitionerRoleResponse;

/** Props for the main PractitionerRoles table component. */
export interface IPractitionerRolesTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedPractitionerRoleResponse;
  /**
   * Active organization ID from the session (Better Auth `activeOrganizationId`).
   * fhir-gql's ListPractitionerRolesSchema has a real org_id filter — results
   * are server-side tenant-scoped.
   */
  orgId: string | null;
  /**
   * Authenticated user's ID from the session (Better Auth `user.id`).
   * Forwarded to the create modal so it can be stamped on newly created
   * roles as `user_id`.
   */
  userId: string | null;
}
