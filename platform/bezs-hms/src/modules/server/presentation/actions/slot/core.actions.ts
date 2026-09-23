/**
 * Slot core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Slot (FHIR R4) — all operations
 *
 * Reads (list, getById) use authenticatedProcedure — listSlotsAction is a
 * real, load-bearing dependency of patient/doctor booking and reschedule
 * flows (BookAppointment.tsx, both RescheduleAppointmentModal.tsx), so it
 * must stay open to any signed-in user. getSlotByIdAction has no current
 * consumer but is left open too since reads aren't the sensitive half here.
 *
 * Mutations (create, update, delete) use adminProcedure — confirmed via a
 * full-repo grep that none of the three had any client consumer, meaning
 * every authenticated user could create/update/delete Slots directly
 * despite this file's own header previously claiming admin-only management.
 * Same class of gap originally found and fixed on Organization.
 *
 * Mutating actions include transportOptions for cache revalidation; read
 * actions do not.
 */

"use server";

import {
  CreateSlotActionSchema,
  ListSlotsActionSchema,
  GetSlotByIdActionSchema,
  UpdateSlotActionSchema,
  DeleteSlotActionSchema,
  GenerateSlotsActionSchema,
  type TCreateSlotAction,
  type TListSlotsAction,
  type TGetSlotByIdAction,
  type TUpdateSlotAction,
  type TDeleteSlotAction,
  type TGenerateSlotsAction,
} from "@/modules/entities/schemas/slot";
import {
  createSlotController,
  listSlotsController,
  getSlotByIdController,
  updateSlotController,
  deleteSlotController,
  generateSlotsController,
  type TCreateSlotControllerOutput,
  type TListSlotsControllerOutput,
  type TGetSlotByIdControllerOutput,
  type TUpdateSlotControllerOutput,
  type TGenerateSlotsControllerOutput,
} from "@/modules/server/core/slot/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/** Creates a Slot with all inline child arrays (schedule + status required). Admin-only. */
export const createSlotAction = adminProcedure
  .createServerAction()
  .input(CreateSlotActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateSlotAction }) => {
    return await runWithTransport<TCreateSlotControllerOutput>(async () => {
      const data = await createSlotController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/**
 * Lists Slots with optional server-side filters (status, schedule_id, practitioner_role_id, etc.).
 * Open to any authenticated user — required by patient/doctor booking and reschedule flows.
 */
export const listSlotsAction = authenticatedProcedure
  .createServerAction()
  .input(ListSlotsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListSlotsAction }) => {
    return await runWithTransport<TListSlotsControllerOutput>(async () => {
      const data = await listSlotsController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single Slot by numeric ID. No current consumer, left open (read-only). */
export const getSlotByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetSlotByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetSlotByIdAction }) => {
    return await runWithTransport<TGetSlotByIdControllerOutput>(async () => {
      const data = await getSlotByIdController(input.payload);
      return { result: data };
    });
  });

/**
 * Patches scalar fields on a Slot (status, start, end, overbooked, comment, appointment_type_*).
 * Child arrays and schedule reference cannot be patched. Admin-only.
 */
export const updateSlotAction = adminProcedure
  .createServerAction()
  .input(UpdateSlotActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateSlotAction }) => {
    return await runWithTransport<TUpdateSlotControllerOutput>(async () => {
      const data = await updateSlotController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a Slot and all child records (cascade). Admin-only. */
export const deleteSlotAction = adminProcedure
  .createServerAction()
  .input(DeleteSlotActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteSlotAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteSlotController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });

/**
 * Bulk-generates free Slots for a Schedule within a time window, one per
 * slot_duration_minutes interval. Atomic on the fhir-gql side — either every
 * slot in the window is created, or the call throws and none are.
 * Admin-only, no existing consumer to preserve.
 */
export const generateSlotsAction = adminProcedure
  .createServerAction()
  .input(GenerateSlotsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGenerateSlotsAction }) => {
    return await runWithTransport<TGenerateSlotsControllerOutput>(async () => {
      const data = await generateSlotsController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
