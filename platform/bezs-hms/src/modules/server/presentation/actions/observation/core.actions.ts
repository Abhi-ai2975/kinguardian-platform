/**
 * Observation core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Observation (FHIR R5) — all operations
 *
 * All actions use authenticatedProcedure — Observation records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateObservationActionSchema,
  ListObservationsActionSchema,
  GetObservationByIdActionSchema,
  UpdateObservationActionSchema,
  DeleteObservationActionSchema,
  type TCreateObservationAction,
  type TListObservationsAction,
  type TGetObservationByIdAction,
  type TUpdateObservationAction,
  type TDeleteObservationAction,
} from "@/modules/entities/schemas/observation";
import {
  createObservationController,
  listObservationsController,
  getObservationByIdController,
  updateObservationController,
  deleteObservationController,
  type TCreateObservationControllerOutput,
  type TListObservationsControllerOutput,
  type TGetObservationByIdControllerOutput,
  type TUpdateObservationControllerOutput,
} from "@/modules/server/core/observation/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Creates an Observation (status required; value[x] fields optional). */
export const createObservationAction = authenticatedProcedure
  .createServerAction()
  .input(CreateObservationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateObservationAction }) => {
    return await runWithTransport<TCreateObservationControllerOutput>(async () => {
      const data = await createObservationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists Observations with optional filters (status, patient_id, effective_from/to, etc.). */
export const listObservationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListObservationsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListObservationsAction }) => {
    return await runWithTransport<TListObservationsControllerOutput>(async () => {
      const data = await listObservationsController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single Observation by numeric ID. */
export const getObservationByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetObservationByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetObservationByIdAction }) => {
    return await runWithTransport<TGetObservationByIdControllerOutput>(async () => {
      const data = await getObservationByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar fields on an Observation (status, value[x] fields, effective_*, etc.). */
export const updateObservationAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateObservationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateObservationAction }) => {
    return await runWithTransport<TUpdateObservationControllerOutput>(async () => {
      const data = await updateObservationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes an Observation and all child records (cascade). */
export const deleteObservationAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteObservationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteObservationAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteObservationController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
