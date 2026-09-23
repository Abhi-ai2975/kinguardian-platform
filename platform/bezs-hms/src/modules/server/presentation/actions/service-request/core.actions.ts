/**
 * ServiceRequest core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: ServiceRequest (FHIR R5) — all operations
 *
 * All actions use authenticatedProcedure — ServiceRequest records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateServiceRequestActionSchema,
  ListServiceRequestsActionSchema,
  GetServiceRequestByIdActionSchema,
  UpdateServiceRequestActionSchema,
  DeleteServiceRequestActionSchema,
  type TCreateServiceRequestAction,
  type TListServiceRequestsAction,
  type TGetServiceRequestByIdAction,
  type TUpdateServiceRequestAction,
  type TDeleteServiceRequestAction,
} from "@/modules/entities/schemas/service-request";
import {
  createServiceRequestController,
  listServiceRequestsController,
  getServiceRequestByIdController,
  updateServiceRequestController,
  deleteServiceRequestController,
  type TCreateServiceRequestControllerOutput,
  type TListServiceRequestsControllerOutput,
  type TGetServiceRequestByIdControllerOutput,
  type TUpdateServiceRequestControllerOutput,
} from "@/modules/server/core/service-request/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Creates a ServiceRequest (status + intent required). */
export const createServiceRequestAction = authenticatedProcedure
  .createServerAction()
  .input(CreateServiceRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateServiceRequestAction }) => {
    return await runWithTransport<TCreateServiceRequestControllerOutput>(async () => {
      const data = await createServiceRequestController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists ServiceRequests with optional filters (status, patient_id, authored_from/to, etc.). */
export const listServiceRequestsAction = authenticatedProcedure
  .createServerAction()
  .input(ListServiceRequestsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListServiceRequestsAction }) => {
    return await runWithTransport<TListServiceRequestsControllerOutput>(async () => {
      const data = await listServiceRequestsController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single ServiceRequest by numeric ID. */
export const getServiceRequestByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetServiceRequestByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetServiceRequestByIdAction }) => {
    return await runWithTransport<TGetServiceRequestByIdControllerOutput>(async () => {
      const data = await getServiceRequestByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar fields on a ServiceRequest (status, priority, intent, occurrence, etc.). */
export const updateServiceRequestAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateServiceRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateServiceRequestAction }) => {
    return await runWithTransport<TUpdateServiceRequestControllerOutput>(async () => {
      const data = await updateServiceRequestController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a ServiceRequest and all child records (cascade). */
export const deleteServiceRequestAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteServiceRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteServiceRequestAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteServiceRequestController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
