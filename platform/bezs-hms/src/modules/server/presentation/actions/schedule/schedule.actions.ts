/**
 * Schedule server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: Schedule
 *
 * All actions use adminProcedure — Schedule is an admin-only resource with
 * no patient-facing read path, so every action is gated behind
 * ROLES["telemedicine-admin"] from creation.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 */

"use server";

import {
  CreateScheduleActionSchema,
  DeleteScheduleActionSchema,
  GetScheduleByIdActionSchema,
  ListSchedulesActionSchema,
  UpdateScheduleActionSchema,
  type TCreateScheduleAction,
  type TDeleteScheduleAction,
  type TGetScheduleByIdAction,
  type TListSchedulesAction,
  type TUpdateScheduleAction,
} from "@/modules/entities/schemas/schedule";
import {
  createScheduleController,
  deleteScheduleController,
  getScheduleByIdController,
  listSchedulesController,
  updateScheduleController,
  type TCreateScheduleControllerOutput,
  type TDeleteScheduleControllerOutput,
  type TGetScheduleByIdControllerOutput,
  type TListSchedulesControllerOutput,
  type TUpdateScheduleControllerOutput,
} from "@/modules/server/core/schedule/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

/** Creates a new schedule. Accepts transportOptions for post-create revalidation. */
export const createScheduleAction = adminProcedure
  .createServerAction()
  .input(CreateScheduleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateScheduleAction }) => {
    return await runWithTransport<TCreateScheduleControllerOutput>(async () => {
      const data = await createScheduleController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists schedules with optional server-side filters and pagination. */
export const listSchedulesAction = adminProcedure
  .createServerAction()
  .input(ListSchedulesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListSchedulesAction }) => {
    return await runWithTransport<TListSchedulesControllerOutput>(async () => {
      const data = await listSchedulesController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single schedule by its numeric ID. */
export const getScheduleByIdAction = adminProcedure
  .createServerAction()
  .input(GetScheduleByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetScheduleByIdAction }) => {
    return await runWithTransport<TGetScheduleByIdControllerOutput>(async () => {
      const data = await getScheduleByIdController(input.payload);
      return { result: data };
    });
  });

/** Partially updates a schedule (scalar fields only). */
export const updateScheduleAction = adminProcedure
  .createServerAction()
  .input(UpdateScheduleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateScheduleAction }) => {
    return await runWithTransport<TUpdateScheduleControllerOutput>(async () => {
      const data = await updateScheduleController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently deletes a schedule (cascades to its Slots). */
export const deleteScheduleAction = adminProcedure
  .createServerAction()
  .input(DeleteScheduleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteScheduleAction }) => {
    return await runWithTransport<TDeleteScheduleControllerOutput>(async () => {
      await deleteScheduleController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
