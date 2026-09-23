/**
 * Client-layer TypeScript types for the Healthcare Services admin feature.
 *
 * Layer: client / telemedicine / admin / types
 *
 * Re-exports entity types with client-facing aliases and defines prop
 * interfaces for table components. Separating these here keeps component
 * files free of import-heavy type declarations.
 */

import {
  THealthcareServiceResponse,
  TPaginatedHealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";

/** Row type used by HealthcareServicesTable and HealthcareServicesTableColumn. */
export type THealthcareService = THealthcareServiceResponse;

/** Props for the main Healthcare Services table component. */
export interface IHealthcareServicesTableProps {
  /** Server-fetched initial page — hydrates the table without a client fetch. */
  initialData: TPaginatedHealthcareServiceResponse;
  /**
   * Active organization ID from the session (Better Auth `activeOrganizationId`).
   * Not forwarded to the list filter (fhir-gql's HealthcareService list has no
   * org_id filter) — used only to scope the create modal's stamped tenant fields.
   */
  orgId: string | null;
  /**
   * Authenticated user's ID from the session (Better Auth `user.id`).
   * Forwarded to the create/edit modals via the admin store so it can be
   * stamped on newly created resources as `user_id`.
   */
  userId: string | null;
}
