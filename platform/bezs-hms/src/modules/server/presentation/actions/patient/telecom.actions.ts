/**
 * Patient telecom sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /telecom sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientTelecomActionSchema,
  DeletePatientTelecomActionSchema,
  ListPatientTelecomActionSchema,
  PatchPatientTelecomActionSchema,
  type TAddPatientTelecomAction,
  type TDeletePatientTelecomAction,
  type TListPatientTelecomAction,
  type TPatchPatientTelecomAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientTelecomController,
  deletePatientTelecomController,
  listPatientTelecomsController,
  patchPatientTelecomController,
  type TAddPatientTelecomControllerOutput,
  type TDeletePatientTelecomControllerOutput,
  type TListPatientTelecomsControllerOutput,
  type TPatchPatientTelecomControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a ContactPoint (telecom) to a Patient. */
export const addPatientTelecomAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientTelecomAction }) => {
    return await runWithTransport<TAddPatientTelecomControllerOutput>(async () => {
      const data = await addPatientTelecomController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all ContactPoint (telecom) entries for a Patient. */
export const listPatientTelecomAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientTelecomAction }) => {
    return await runWithTransport<TListPatientTelecomsControllerOutput>(async () => {
      const data = await listPatientTelecomsController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific ContactPoint on a Patient. */
export const patchPatientTelecomAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientTelecomAction }) => {
    return await runWithTransport<TPatchPatientTelecomControllerOutput>(async () => {
      const data = await patchPatientTelecomController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific ContactPoint from a Patient. */
export const deletePatientTelecomAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientTelecomAction }) => {
    return await runWithTransport<TDeletePatientTelecomControllerOutput>(async () => {
      const data = await deletePatientTelecomController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
