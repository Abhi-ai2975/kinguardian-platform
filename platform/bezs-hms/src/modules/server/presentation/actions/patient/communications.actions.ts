/**
 * Patient communication sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /communications sub-resource (language preferences)
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientCommunicationActionSchema,
  DeletePatientCommunicationActionSchema,
  ListPatientCommunicationsActionSchema,
  PatchPatientCommunicationActionSchema,
  type TAddPatientCommunicationAction,
  type TDeletePatientCommunicationAction,
  type TListPatientCommunicationsAction,
  type TPatchPatientCommunicationAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientCommunicationController,
  deletePatientCommunicationController,
  listPatientCommunicationsController,
  patchPatientCommunicationController,
  type TAddPatientCommunicationControllerOutput,
  type TDeletePatientCommunicationControllerOutput,
  type TListPatientCommunicationsControllerOutput,
  type TPatchPatientCommunicationControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a language preference (communication) to a Patient. */
export const addPatientCommunicationAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientCommunicationAction }) => {
    return await runWithTransport<TAddPatientCommunicationControllerOutput>(async () => {
      const data = await addPatientCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all language preferences for a Patient. */
export const listPatientCommunicationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientCommunicationsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientCommunicationsAction }) => {
    return await runWithTransport<TListPatientCommunicationsControllerOutput>(async () => {
      const data = await listPatientCommunicationsController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific language preference on a Patient. */
export const patchPatientCommunicationAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientCommunicationAction }) => {
    return await runWithTransport<TPatchPatientCommunicationControllerOutput>(async () => {
      const data = await patchPatientCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific language preference from a Patient. */
export const deletePatientCommunicationAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientCommunicationAction }) => {
    return await runWithTransport<TDeletePatientCommunicationControllerOutput>(async () => {
      const data = await deletePatientCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
