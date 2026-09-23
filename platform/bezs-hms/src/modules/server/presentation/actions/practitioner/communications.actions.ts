/**
 * Practitioner communication sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /communications sub-resource
 *
 * add/patch/delete have no consumer anywhere (confirmed via a full-repo
 * grep — DoctorProfileForm.tsx only uses the atomic /full endpoints) so they
 * use adminProcedure. list stays authenticatedProcedure — a read with no
 * reason to restrict. Mutating actions include transportOptions for cache
 * revalidation; list does not.
 */

"use server";

import {
  AddPractitionerCommunicationActionSchema,
  DeletePractitionerCommunicationActionSchema,
  ListPractitionerCommunicationsActionSchema,
  PatchPractitionerCommunicationActionSchema,
  type TAddPractitionerCommunicationAction,
  type TDeletePractitionerCommunicationAction,
  type TListPractitionerCommunicationsAction,
  type TPatchPractitionerCommunicationAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerCommunicationController,
  deletePractitionerCommunicationController,
  listPractitionerCommunicationsController,
  patchPractitionerCommunicationController,
  type TAddPractitionerCommunicationControllerOutput,
  type TListPractitionerCommunicationsControllerOutput,
  type TPatchPractitionerCommunicationControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Adds a language preference to a Practitioner. No current consumer; admin-only. */
export const addPractitionerCommunicationAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerCommunicationAction }) => {
    return await runWithTransport<TAddPractitionerCommunicationControllerOutput>(async () => {
      const data = await addPractitionerCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all communication records for a Practitioner. */
export const listPractitionerCommunicationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerCommunicationsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerCommunicationsAction }) => {
    return await runWithTransport<TListPractitionerCommunicationsControllerOutput>(async () => {
      const data = await listPractitionerCommunicationsController(input.payload);
      return { result: data };
    });
  });

/** Patches a language preference on a Practitioner. No current consumer; admin-only. */
export const patchPractitionerCommunicationAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerCommunicationAction }) => {
    return await runWithTransport<TPatchPractitionerCommunicationControllerOutput>(async () => {
      const data = await patchPractitionerCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a communication record from a Practitioner. No current consumer; admin-only. */
export const deletePractitionerCommunicationAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerCommunicationAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerCommunicationController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
