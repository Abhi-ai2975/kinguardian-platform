/**
 * Practitioner address sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /addresses sub-resource
 *
 * add/patch/delete have no consumer anywhere (confirmed via a full-repo
 * grep — DoctorProfileForm.tsx only uses the atomic /full endpoints) so they
 * use adminProcedure. list stays authenticatedProcedure — a read with no
 * reason to restrict. Mutating actions include transportOptions for cache
 * revalidation; list does not.
 */

"use server";

import {
  AddPractitionerAddressActionSchema,
  DeletePractitionerAddressActionSchema,
  ListPractitionerAddressesActionSchema,
  PatchPractitionerAddressActionSchema,
  type TAddPractitionerAddressAction,
  type TDeletePractitionerAddressAction,
  type TListPractitionerAddressesAction,
  type TPatchPractitionerAddressAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerAddressController,
  deletePractitionerAddressController,
  listPractitionerAddressesController,
  patchPractitionerAddressController,
  type TAddPractitionerAddressControllerOutput,
  type TListPractitionerAddressesControllerOutput,
  type TPatchPractitionerAddressControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Adds an Address to a Practitioner. No current consumer; admin-only. */
export const addPractitionerAddressAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerAddressActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerAddressAction }) => {
    return await runWithTransport<TAddPractitionerAddressControllerOutput>(async () => {
      const data = await addPractitionerAddressController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all address records for a Practitioner. */
export const listPractitionerAddressesAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerAddressesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerAddressesAction }) => {
    return await runWithTransport<TListPractitionerAddressesControllerOutput>(async () => {
      const data = await listPractitionerAddressesController(input.payload);
      return { result: data };
    });
  });

/** Patches an Address on a Practitioner. No current consumer; admin-only. */
export const patchPractitionerAddressAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerAddressActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerAddressAction }) => {
    return await runWithTransport<TPatchPractitionerAddressControllerOutput>(async () => {
      const data = await patchPractitionerAddressController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes an address record from a Practitioner. No current consumer; admin-only. */
export const deletePractitionerAddressAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerAddressActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerAddressAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerAddressController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
