/**
 * Patient identifier sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /identifiers sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientIdentifierActionSchema,
  DeletePatientIdentifierActionSchema,
  ListPatientIdentifiersActionSchema,
  PatchPatientIdentifierActionSchema,
  type TAddPatientIdentifierAction,
  type TDeletePatientIdentifierAction,
  type TListPatientIdentifiersAction,
  type TPatchPatientIdentifierAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientIdentifierController,
  deletePatientIdentifierController,
  listPatientIdentifiersController,
  patchPatientIdentifierController,
  type TAddPatientIdentifierControllerOutput,
  type TDeletePatientIdentifierControllerOutput,
  type TListPatientIdentifiersControllerOutput,
  type TPatchPatientIdentifierControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds an Identifier to a Patient. */
export const addPatientIdentifierAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientIdentifierActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientIdentifierAction }) => {
    return await runWithTransport<TAddPatientIdentifierControllerOutput>(async () => {
      const data = await addPatientIdentifierController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all Identifiers for a Patient. */
export const listPatientIdentifiersAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientIdentifiersActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientIdentifiersAction }) => {
    return await runWithTransport<TListPatientIdentifiersControllerOutput>(async () => {
      const data = await listPatientIdentifiersController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific Identifier on a Patient. */
export const patchPatientIdentifierAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientIdentifierActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientIdentifierAction }) => {
    return await runWithTransport<TPatchPatientIdentifierControllerOutput>(async () => {
      const data = await patchPatientIdentifierController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific Identifier from a Patient. */
export const deletePatientIdentifierAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientIdentifierActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientIdentifierAction }) => {
    return await runWithTransport<TDeletePatientIdentifierControllerOutput>(async () => {
      const data = await deletePatientIdentifierController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
