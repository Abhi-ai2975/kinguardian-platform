/**
 * Appointment core server actions — book, create, getMe, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Appointment (FHIR R4/R5) — all 7 operations
 *
 * All actions use authenticatedProcedure — any authenticated user (patient,
 * practitioner, admin) may book or manage their own appointments. Server-side
 * filtering by user_id / org_id in the list use case enforces data isolation.
 *
 * getMyAppointments injects the session userId into the payload before
 * delegating to the controller, so the client cannot supply a different userId
 * and read another user's appointments.
 *
 * Mutating actions include transportOptions for Next.js cache revalidation.
 */

"use server";

import type { AuthResponse } from "@/modules/server/auth/types";
import {
  BookAppointmentActionSchema,
  CreateAppointmentActionSchema,
  GetMyAppointmentsActionSchema,
  ListAppointmentsActionSchema,
  GetAppointmentByIdActionSchema,
  UpdateAppointmentActionSchema,
  DeleteAppointmentActionSchema,
  RescheduleAppointmentActionSchema,
  type TBookAppointmentAction,
  type TCreateAppointmentAction,
  type TGetMyAppointmentsAction,
  type TListAppointmentsAction,
  type TGetAppointmentByIdAction,
  type TUpdateAppointmentAction,
  type TDeleteAppointmentAction,
  type TRescheduleAppointmentAction,
} from "@/modules/entities/schemas/appointment";
import {
  bookAppointmentController,
  createAppointmentController,
  getMyAppointmentsController,
  listAppointmentsController,
  getAppointmentByIdController,
  updateAppointmentController,
  deleteAppointmentController,
  rescheduleAppointmentController,
  type TBookAppointmentControllerOutput,
  type TCreateAppointmentControllerOutput,
  type TGetMyAppointmentsControllerOutput,
  type TListAppointmentsControllerOutput,
  type TGetAppointmentByIdControllerOutput,
  type TUpdateAppointmentControllerOutput,
  type TRescheduleAppointmentControllerOutput,
} from "@/modules/server/core/appointment/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/**
 * Books an appointment atomically via POST /appointments/book.
 * Returns 409 if the slot is no longer free.
 */
export const bookAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(BookAppointmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TBookAppointmentAction }) => {
    return await runWithTransport<TBookAppointmentControllerOutput>(async () => {
      const data = await bookAppointmentController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Creates a full FHIR Appointment with all optional child arrays. */
export const createAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(CreateAppointmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateAppointmentAction }) => {
    return await runWithTransport<TCreateAppointmentControllerOutput>(async () => {
      const data = await createAppointmentController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/**
 * Lists appointments for the currently authenticated user.
 * The session userId is injected server-side — the client cannot override it.
 */
export const getMyAppointmentsAction = authenticatedProcedure
  .createServerAction()
  .input(GetMyAppointmentsActionSchema, { skipInputParsing: true })
  .handler(async ({ input, ctx }: { input: TGetMyAppointmentsAction; ctx: { session: AuthResponse } }) => {
    return await runWithTransport<TGetMyAppointmentsControllerOutput>(async () => {
      // Merge session userId into the payload — prevents client from supplying a different userId
      const enrichedPayload = {
        ...input.payload,
        userId: ctx.session.session.userId,
      };
      const data = await getMyAppointmentsController(enrichedPayload);
      return { result: data };
    });
  });

/** Lists all Appointments with optional cross-tenant filters. */
export const listAppointmentsAction = authenticatedProcedure
  .createServerAction()
  .input(ListAppointmentsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListAppointmentsAction }) => {
    return await runWithTransport<TListAppointmentsControllerOutput>(async () => {
      const data = await listAppointmentsController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single Appointment by numeric ID. */
export const getAppointmentByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetAppointmentByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetAppointmentByIdAction }) => {
    return await runWithTransport<TGetAppointmentByIdControllerOutput>(async () => {
      const data = await getAppointmentByIdController(input.payload);
      return { result: data };
    });
  });

/**
 * Patches scalar fields on an Appointment (status, dates, cancellation, priority).
 * Child arrays cannot be updated in-place.
 */
export const updateAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateAppointmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateAppointmentAction }) => {
    return await runWithTransport<TUpdateAppointmentControllerOutput>(async () => {
      const data = await updateAppointmentController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes an Appointment and all child records (cascade). */
export const deleteAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteAppointmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteAppointmentAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteAppointmentController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });

/**
 * Atomically reschedules an Appointment to a new free Slot.
 * Backend frees old slot, updates appointment start/end, marks new slot busy.
 */
export const rescheduleAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(RescheduleAppointmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TRescheduleAppointmentAction }) => {
    return await runWithTransport<TRescheduleAppointmentControllerOutput>(async () => {
      const data = await rescheduleAppointmentController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
