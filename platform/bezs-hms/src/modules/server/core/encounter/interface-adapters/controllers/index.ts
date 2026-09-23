/**
 * Encounter controllers barrel.
 *
 * Layer: server / core / encounter / interface-adapters / controllers
 *
 * Re-exports all 5 encounter controllers and their output types.
 * Server actions import from this barrel — never from individual controller files.
 */

export * from "./createEncounter.controller";
export * from "./listEncounters.controller";
export * from "./getEncounterById.controller";
export * from "./updateEncounter.controller";
export * from "./deleteEncounter.controller";
