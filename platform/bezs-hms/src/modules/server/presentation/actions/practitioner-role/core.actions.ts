/**
 * PractitionerRole core server actions — create, list, listForBooking, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: PractitionerRole (FHIR R4) — all operations
 *
 * Reads used by real booking flows (`listPractitionerRolesAction` — both
 * RescheduleAppointmentModal.tsx; `listPractitionerRolesForBookingAction` —
 * BookAppointment.tsx) stay on `authenticatedProcedure`. `getById`, `create`,
 * `update`, `delete` have no consumer outside the admin section — confirmed
 * via a full-repo grep — so they move to `adminProcedure`. Same class of gap
 * originally found and fixed on Organization and Slot.
 *
 * Mutating actions include transportOptions for cache revalidation; read
 * actions do not.
 */

"use server";

import {
  CreatePractitionerRoleActionSchema,
  ListPractitionerRolesActionSchema,
  ListPractitionerRolesForBookingActionSchema,
  GetPractitionerRoleByIdActionSchema,
  UpdatePractitionerRoleActionSchema,
  DeletePractitionerRoleActionSchema,
  type TCreatePractitionerRoleAction,
  type TListPractitionerRolesAction,
  type TListPractitionerRolesForBookingAction,
  type TGetPractitionerRoleByIdAction,
  type TUpdatePractitionerRoleAction,
  type TDeletePractitionerRoleAction,
} from "@/modules/entities/schemas/practitioner-role";
import {
  createPractitionerRoleController,
  listPractitionerRolesController,
  listPractitionerRolesForBookingController,
  getPractitionerRoleByIdController,
  updatePractitionerRoleController,
  deletePractitionerRoleController,
  type TCreatePractitionerRoleControllerOutput,
  type TListPractitionerRolesControllerOutput,
  type TListPractitionerRolesForBookingControllerOutput,
  type TGetPractitionerRoleByIdControllerOutput,
  type TUpdatePractitionerRoleControllerOutput,
} from "@/modules/server/core/practitioner-role/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Creates a PractitionerRole with all inline child arrays in a single request. Admin-only. */
export const createPractitionerRoleAction = adminProcedure
  .createServerAction()
  .input(CreatePractitionerRoleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePractitionerRoleAction }) => {
    return await runWithTransport<TCreatePractitionerRoleControllerOutput>(async () => {
      const data = await createPractitionerRoleController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists PractitionerRoles with optional server-side filters and pagination. */
export const listPractitionerRolesAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerRolesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerRolesAction }) => {
    return await runWithTransport<TListPractitionerRolesControllerOutput>(async () => {
      const data = await listPractitionerRolesController(input.payload);
      return { result: data };
    });
  });

/**
 * Lists PractitionerRoles enriched with Practitioner detail for booking UIs.
 * Calls GET /practitioner-roles/booking (filters by specialty, day_of_week, active).
 */
export const listPractitionerRolesForBookingAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerRolesForBookingActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerRolesForBookingAction }) => {
    return await runWithTransport<TListPractitionerRolesForBookingControllerOutput>(async () => {
      const data = await listPractitionerRolesForBookingController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single PractitionerRole by numeric ID. No current consumer outside admin; admin-only. */
export const getPractitionerRoleByIdAction = adminProcedure
  .createServerAction()
  .input(GetPractitionerRoleByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPractitionerRoleByIdAction }) => {
    return await runWithTransport<TGetPractitionerRoleByIdControllerOutput>(async () => {
      const data = await getPractitionerRoleByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar fields on a PractitionerRole (active, period_start, period_end, availability_exceptions). Admin-only. */
export const updatePractitionerRoleAction = adminProcedure
  .createServerAction()
  .input(UpdatePractitionerRoleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePractitionerRoleAction }) => {
    return await runWithTransport<TUpdatePractitionerRoleControllerOutput>(async () => {
      const data = await updatePractitionerRoleController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a PractitionerRole and all child records (cascade). Admin-only. */
export const deletePractitionerRoleAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerRoleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerRoleAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerRoleController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
