/**
 * Patient name sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /names sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientNameActionSchema,
  DeletePatientNameActionSchema,
  ListPatientNamesActionSchema,
  PatchPatientNameActionSchema,
  type TAddPatientNameAction,
  type TDeletePatientNameAction,
  type TListPatientNamesAction,
  type TPatchPatientNameAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientNameController,
  deletePatientNameController,
  listPatientNamesController,
  patchPatientNameController,
  type TAddPatientNameControllerOutput,
  type TDeletePatientNameControllerOutput,
  type TListPatientNamesControllerOutput,
  type TPatchPatientNameControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a HumanName to a Patient. */
export const addPatientNameAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientNameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientNameAction }) => {
    return await runWithTransport<TAddPatientNameControllerOutput>(async () => {
      const data = await addPatientNameController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all HumanName entries for a Patient. */
export const listPatientNamesAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientNamesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientNamesAction }) => {
    return await runWithTransport<TListPatientNamesControllerOutput>(async () => {
      const data = await listPatientNamesController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific HumanName on a Patient. */
export const patchPatientNameAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientNameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientNameAction }) => {
    return await runWithTransport<TPatchPatientNameControllerOutput>(async () => {
      const data = await patchPatientNameController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific HumanName from a Patient. */
export const deletePatientNameAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientNameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientNameAction }) => {
    return await runWithTransport<TDeletePatientNameControllerOutput>(async () => {
      const data = await deletePatientNameController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
