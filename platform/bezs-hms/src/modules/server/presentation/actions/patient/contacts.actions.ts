/**
 * Patient contact sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /contacts sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientContactActionSchema,
  DeletePatientContactActionSchema,
  ListPatientContactsActionSchema,
  PatchPatientContactActionSchema,
  type TAddPatientContactAction,
  type TDeletePatientContactAction,
  type TListPatientContactsAction,
  type TPatchPatientContactAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientContactController,
  deletePatientContactController,
  listPatientContactsController,
  patchPatientContactController,
  type TAddPatientContactControllerOutput,
  type TDeletePatientContactControllerOutput,
  type TListPatientContactsControllerOutput,
  type TPatchPatientContactControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a contact person to a Patient. */
export const addPatientContactAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientContactActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientContactAction }) => {
    return await runWithTransport<TAddPatientContactControllerOutput>(async () => {
      const data = await addPatientContactController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all contact persons for a Patient. */
export const listPatientContactsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientContactsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientContactsAction }) => {
    return await runWithTransport<TListPatientContactsControllerOutput>(async () => {
      const data = await listPatientContactsController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific contact person on a Patient. */
export const patchPatientContactAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientContactActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientContactAction }) => {
    return await runWithTransport<TPatchPatientContactControllerOutput>(async () => {
      const data = await patchPatientContactController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific contact person from a Patient. */
export const deletePatientContactAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientContactActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientContactAction }) => {
    return await runWithTransport<TDeletePatientContactControllerOutput>(async () => {
      const data = await deletePatientContactController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
