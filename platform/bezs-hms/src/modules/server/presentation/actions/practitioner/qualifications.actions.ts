/**
 * Practitioner qualification sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /qualifications sub-resource
 *
 * add/patch/delete have no consumer anywhere (confirmed via a full-repo
 * grep) so they use adminProcedure. list stays authenticatedProcedure — a
 * read with no reason to restrict. Mutating actions include transportOptions
 * for cache revalidation; list does not.
 */

"use server";

import {
  AddPractitionerQualificationActionSchema,
  DeletePractitionerQualificationActionSchema,
  ListPractitionerQualificationsActionSchema,
  PatchPractitionerQualificationActionSchema,
  type TAddPractitionerQualificationAction,
  type TDeletePractitionerQualificationAction,
  type TListPractitionerQualificationsAction,
  type TPatchPractitionerQualificationAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerQualificationController,
  deletePractitionerQualificationController,
  listPractitionerQualificationsController,
  patchPractitionerQualificationController,
  type TAddPractitionerQualificationControllerOutput,
  type TListPractitionerQualificationsControllerOutput,
  type TPatchPractitionerQualificationControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Adds a Qualification (certification, license, training) to a Practitioner. No current consumer; admin-only. */
export const addPractitionerQualificationAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerQualificationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerQualificationAction }) => {
    return await runWithTransport<TAddPractitionerQualificationControllerOutput>(async () => {
      const data = await addPractitionerQualificationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all qualification records for a Practitioner. */
export const listPractitionerQualificationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerQualificationsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerQualificationsAction }) => {
    return await runWithTransport<TListPractitionerQualificationsControllerOutput>(async () => {
      const data = await listPractitionerQualificationsController(input.payload);
      return { result: data };
    });
  });

/** Patches a Qualification on a Practitioner. Identifier array is fully replaced if provided. No current consumer; admin-only. */
export const patchPractitionerQualificationAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerQualificationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerQualificationAction }) => {
    return await runWithTransport<TPatchPractitionerQualificationControllerOutput>(async () => {
      const data = await patchPractitionerQualificationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a qualification record from a Practitioner. No current consumer; admin-only. */
export const deletePractitionerQualificationAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerQualificationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerQualificationAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerQualificationController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
