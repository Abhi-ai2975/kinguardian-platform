/**
 * Observation controllers barrel.
 *
 * Layer: server / core / observation / interface-adapters / controllers
 *
 * Re-exports all 5 observation controllers and their output types.
 * Server actions import from this barrel — never from individual controller files.
 */

export * from "./createObservation.controller";
export * from "./listObservations.controller";
export * from "./getObservationById.controller";
export * from "./updateObservation.controller";
export * from "./deleteObservation.controller";
