/**
 * MedicationRequest core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: MedicationRequest (FHIR R5) — all operations
 *
 * All actions use authenticatedProcedure — MedicationRequest records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateMedicationRequestActionSchema,
  ListMedicationRequestsActionSchema,
  GetMedicationRequestByIdActionSchema,
  UpdateMedicationRequestActionSchema,
  DeleteMedicationRequestActionSchema,
  type TCreateMedicationRequestAction,
  type TListMedicationRequestsAction,
  type TGetMedicationRequestByIdAction,
  type TUpdateMedicationRequestAction,
  type TDeleteMedicationRequestAction,
} from "@/modules/entities/schemas/medication-request";
import {
  createMedicationRequestController,
  listMedicationRequestsController,
  getMedicationRequestByIdController,
  updateMedicationRequestController,
  deleteMedicationRequestController,
  type TCreateMedicationRequestControllerOutput,
  type TListMedicationRequestsControllerOutput,
  type TGetMedicationRequestByIdControllerOutput,
  type TUpdateMedicationRequestControllerOutput,
} from "@/modules/server/core/medication-request/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Creates a MedicationRequest (status + intent required). */
export const createMedicationRequestAction = authenticatedProcedure
  .createServerAction()
  .input(CreateMedicationRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateMedicationRequestAction }) => {
    return await runWithTransport<TCreateMedicationRequestControllerOutput>(async () => {
      const data = await createMedicationRequestController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists MedicationRequests with optional filters (status, patient_id, authored_from/to, etc.). */
export const listMedicationRequestsAction = authenticatedProcedure
  .createServerAction()
  .input(ListMedicationRequestsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListMedicationRequestsAction }) => {
    return await runWithTransport<TListMedicationRequestsControllerOutput>(async () => {
      const data = await listMedicationRequestsController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single MedicationRequest by numeric ID. */
export const getMedicationRequestByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetMedicationRequestByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetMedicationRequestByIdAction }) => {
    return await runWithTransport<TGetMedicationRequestByIdControllerOutput>(async () => {
      const data = await getMedicationRequestByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar fields on a MedicationRequest (status, intent, priority, authored_on, etc.). */
export const updateMedicationRequestAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateMedicationRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateMedicationRequestAction }) => {
    return await runWithTransport<TUpdateMedicationRequestControllerOutput>(async () => {
      const data = await updateMedicationRequestController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a MedicationRequest and all child records (cascade). */
export const deleteMedicationRequestAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteMedicationRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteMedicationRequestAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteMedicationRequestController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
