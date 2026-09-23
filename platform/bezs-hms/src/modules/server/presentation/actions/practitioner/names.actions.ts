/**
 * Practitioner name sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /names sub-resource
 *
 * add/patch/delete have no consumer anywhere (confirmed via a full-repo
 * grep — DoctorProfileForm.tsx only uses the atomic /full endpoints) so they
 * use adminProcedure. list stays authenticatedProcedure — a read with no
 * reason to restrict. Mutating actions include transportOptions for cache
 * revalidation; list does not.
 */

"use server";

import {
  AddPractitionerNameActionSchema,
  DeletePractitionerNameActionSchema,
  ListPractitionerNamesActionSchema,
  PatchPractitionerNameActionSchema,
  type TAddPractitionerNameAction,
  type TDeletePractitionerNameAction,
  type TListPractitionerNamesAction,
  type TPatchPractitionerNameAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerNameController,
  deletePractitionerNameController,
  listPractitionerNamesController,
  patchPractitionerNameController,
  type TAddPractitionerNameControllerOutput,
  type TListPractitionerNamesControllerOutput,
  type TPatchPractitionerNameControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Adds a HumanName to a Practitioner. No current consumer; admin-only. */
export const addPractitionerNameAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerNameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerNameAction }) => {
    return await runWithTransport<TAddPractitionerNameControllerOutput>(async () => {
      const data = await addPractitionerNameController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all HumanName entries for a Practitioner. */
export const listPractitionerNamesAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerNamesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerNamesAction }) => {
    return await runWithTransport<TListPractitionerNamesControllerOutput>(async () => {
      const data = await listPractitionerNamesController(input.payload);
      return { result: data };
    });
  });

/** Patches a HumanName record on a Practitioner. No current consumer; admin-only. */
export const patchPractitionerNameAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerNameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerNameAction }) => {
    return await runWithTransport<TPatchPractitionerNameControllerOutput>(async () => {
      const data = await patchPractitionerNameController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a HumanName record from a Practitioner. No current consumer; admin-only. */
export const deletePractitionerNameAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerNameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerNameAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerNameController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
