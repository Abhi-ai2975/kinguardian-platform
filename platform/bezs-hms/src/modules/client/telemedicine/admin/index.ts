/**
 * Barrel export for the telemedicine admin client module.
 *
 * Layer: client / telemedicine / admin
 *
 * Pages import from this file to keep import paths stable even if the
 * internal folder structure changes.
 */

export { OrganizationsTable } from "./components/organizations/OrganizationsTable";
export { OrganizationModalProvider } from "./provider/OrganizationModalProvider";
export { LocationsTable } from "./components/locations/LocationsTable";
export { LocationModalProvider } from "./provider/LocationModalProvider";
export { HealthcareServicesTable } from "./components/healthcare-services/HealthcareServicesTable";
export { HealthcareServiceModalProvider } from "./provider/HealthcareServiceModalProvider";
export { useAdminStore, adminStore } from "./stores/admin.store";
export type { ModalType, ModalData } from "./stores/admin.store";
export type { IOrganizationsTableProps, TOrganization } from "./types/organizations.type";
export type { ILocationsTableProps, TLocation } from "./types/locations.type";
export type {
  IHealthcareServicesTableProps,
  THealthcareService,
} from "./types/healthcareServices.type";
