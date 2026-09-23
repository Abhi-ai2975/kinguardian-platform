/**
 * MedicationRequest controllers barrel.
 *
 * Layer: server / core / medication-request / interface-adapters / controllers
 *
 * Re-exports all 5 medication request controllers and their output types.
 * Server actions import from this barrel — never from individual controller files.
 */

export * from "./createMedicationRequest.controller";
export * from "./listMedicationRequests.controller";
export * from "./getMedicationRequestById.controller";
export * from "./updateMedicationRequest.controller";
export * from "./deleteMedicationRequest.controller";
