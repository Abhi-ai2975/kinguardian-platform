/**
 * Appointment entity schema barrel.
 *
 * Layer: entities / schemas / appointment
 *
 * Re-exports all Zod schemas, inferred types, and ZSA action schemas for the
 * Appointment FHIR resource. Import from this barrel in application, interface-
 * adapters, and presentation layers.
 */

export * from "./response";
export * from "./input";
export * from "./actions";
