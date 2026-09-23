/**
 * ServiceRequest controllers barrel.
 *
 * Layer: server / core / service-request / interface-adapters / controllers
 *
 * Re-exports all 5 service request controllers and their output types.
 * Server actions import from this barrel — never from individual controller files.
 */

export * from "./createServiceRequest.controller";
export * from "./listServiceRequests.controller";
export * from "./getServiceRequestById.controller";
export * from "./updateServiceRequest.controller";
export * from "./deleteServiceRequest.controller";
