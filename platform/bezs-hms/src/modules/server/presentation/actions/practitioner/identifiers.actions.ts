/**
 * Practitioner identifier sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /identifiers sub-resource
 *
 * add/patch/delete have no consumer anywhere (confirmed via a full-repo
 * grep) so they use adminProcedure. list stays authenticatedProcedure — a
 * read with no reason to restrict. Mutating actions include transportOptions
 * for cache revalidation; list does not.
 */

"use server";

import {
  AddPractitionerIdentifierActionSchema,
  DeletePractitionerIdentifierActionSchema,
  ListPractitionerIdentifiersActionSchema,
  PatchPractitionerIdentifierActionSchema,
  type TAddPractitionerIdentifierAction,
  type TDeletePractitionerIdentifierAction,
  type TListPractitionerIdentifiersAction,
  type TPatchPractitionerIdentifierAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerIdentifierController,
  deletePractitionerIdentifierController,
  listPractitionerIdentifiersController,
  patchPractitionerIdentifierController,
  type TAddPractitionerIdentifierControllerOutput,
  type TListPractitionerIdentifiersControllerOutput,
  type TPatchPractitionerIdentifierControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Adds a business identifier (NPI, DEA, etc.) to a Practitioner. No current consumer; admin-only. */
export const addPractitionerIdentifierAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerIdentifierActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerIdentifierAction }) => {
    return await runWithTransport<TAddPractitionerIdentifierControllerOutput>(async () => {
      const data = await addPractitionerIdentifierController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all identifier records for a Practitioner. */
export const listPractitionerIdentifiersAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerIdentifiersActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerIdentifiersAction }) => {
    return await runWithTransport<TListPractitionerIdentifiersControllerOutput>(async () => {
      const data = await listPractitionerIdentifiersController(input.payload);
      return { result: data };
    });
  });

/** Patches a business identifier on a Practitioner. No current consumer; admin-only. */
export const patchPractitionerIdentifierAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerIdentifierActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerIdentifierAction }) => {
    return await runWithTransport<TPatchPractitionerIdentifierControllerOutput>(async () => {
      const data = await patchPractitionerIdentifierController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes an identifier record from a Practitioner. No current consumer; admin-only. */
export const deletePractitionerIdentifierAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerIdentifierActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerIdentifierAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerIdentifierController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
