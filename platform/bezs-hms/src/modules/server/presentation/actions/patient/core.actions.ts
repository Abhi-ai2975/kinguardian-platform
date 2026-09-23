/**
 * Patient core server actions — create, list, getMe, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — core operations
 *
 * All actions use authenticatedProcedure — any signed-in user may manage their
 * own Patient record. Mutating actions include transportOptions for cache
 * revalidation; read actions do not.
 */

"use server";

import {
  CreatePatientActionSchema,
  CreatePatientFullActionSchema,
  DeletePatientActionSchema,
  GetPatientByIdActionSchema,
  ListPatientsActionSchema,
  UpdatePatientActionSchema,
  UpdatePatientFullActionSchema,
  type TCreatePatientAction,
  type TCreatePatientFullAction,
  type TDeletePatientAction,
  type TGetPatientByIdAction,
  type TListPatientsAction,
  type TUpdatePatientAction,
  type TUpdatePatientFullAction,
} from "@/modules/entities/schemas/patient";
import {
  createPatientController,
  createPatientFullController,
  deletePatientController,
  getPatientByIdController,
  getPatientMeController,
  listPatientsController,
  updatePatientController,
  updatePatientFullController,
  type TCreatePatientControllerOutput,
  type TCreatePatientFullControllerOutput,
  type TDeletePatientControllerOutput,
  type TGetPatientByIdControllerOutput,
  type TGetPatientMeControllerOutput,
  type TListPatientsControllerOutput,
  type TUpdatePatientControllerOutput,
  type TUpdatePatientFullControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Atomically creates a Patient with sub-resources in a single request. */
export const createPatientFullAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePatientFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePatientFullAction }) => {
    return await runWithTransport<TCreatePatientFullControllerOutput>(
      async () => {
        const data = await createPatientFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Atomically updates a Patient's scalar fields and sub-resource arrays in a single request. */
export const updatePatientFullAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePatientFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePatientFullAction }) => {
    return await runWithTransport<TUpdatePatientFullControllerOutput>(
      async () => {
        const data = await updatePatientFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Creates a new Patient record. Accepts transportOptions for post-create revalidation. */
export const createPatientAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePatientAction }) => {
    return await runWithTransport<TCreatePatientControllerOutput>(async () => {
      const data = await createPatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists patients with optional server-side filters and pagination. */
export const listPatientsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientsAction }) => {
    return await runWithTransport<TListPatientsControllerOutput>(async () => {
      const data = await listPatientsController(input.payload);
      return { result: data };
    });
  });

/** Fetches the authenticated user's own Patient record. */
export const getPatientMeAction = authenticatedProcedure
  .createServerAction()
  .handler(async () => {
    return await runWithTransport<TGetPatientMeControllerOutput>(async () => {
      const data = await getPatientMeController();
      return { result: data };
    });
  });

/** Fetches a single Patient by numeric ID. */
export const getPatientByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetPatientByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPatientByIdAction }) => {
    return await runWithTransport<TGetPatientByIdControllerOutput>(async () => {
      const data = await getPatientByIdController(input.payload);
      return { result: data };
    });
  });

/** Partially updates scalar fields on a Patient. Accepts transportOptions for revalidation. */
export const updatePatientAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePatientAction }) => {
    return await runWithTransport<TUpdatePatientControllerOutput>(async () => {
      const data = await updatePatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a Patient and all child records. Accepts transportOptions for revalidation. */
export const deletePatientAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientAction }) => {
    return await runWithTransport<TDeletePatientControllerOutput>(async () => {
      const data = await deletePatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
