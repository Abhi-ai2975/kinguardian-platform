/**
 * Client-layer TypeScript types for the Practitioners admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table components. Separating these here keeps component
 * files free of import-heavy type declarations.
 */

import {
  TPractitionerResponse,
  TPaginatedPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";

/** Row type used by PractitionersTable and PractitionersTableColumn. */
export type TPractitioner = TPractitionerResponse;

/** Props for the main Practitioners table component. */
export interface IPractitionersTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedPractitionerResponse;
  /**
   * Active organization ID from the session (Better Auth `activeOrganizationId`).
   * fhir-gql's ListPractitionersSchema has a real org_id filter — results
   * are server-side tenant-scoped.
   */
  orgId: string | null;
  /**
   * Authenticated user's ID from the session (Better Auth `user.id`).
   * NOT stamped onto created practitioners here (unlike every other
   * resource) — the create form has its own explicit, required `user_id`
   * input since a Practitioner record links to a specific person's user
   * account, not the admin creating it. Still forwarded to the create modal
   * in case a future default-prefill is wanted.
   */
  userId: string | null;
}
