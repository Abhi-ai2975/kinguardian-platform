/**
 * Practitioner server actions barrel.
 *
 * Layer: presentation / actions / practitioner
 *
 * Re-exports all practitioner server action groups. Client code imports from
 * this barrel — never from individual action files directly.
 */

export * from "./core.actions";
export * from "./names.actions";
export * from "./identifiers.actions";
export * from "./telecom.actions";
export * from "./addresses.actions";
export * from "./photos.actions";
export * from "./qualifications.actions";
export * from "./communications.actions";
