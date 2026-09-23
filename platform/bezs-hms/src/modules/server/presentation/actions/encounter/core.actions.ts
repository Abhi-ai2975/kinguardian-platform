/**
 * Encounter core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Encounter (FHIR R5) — all operations
 *
 * All actions use authenticatedProcedure — Encounter records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import { z } from "zod";
import {
  CreateEncounterActionSchema,
  ListEncountersActionSchema,
  GetEncounterByIdActionSchema,
  UpdateEncounterActionSchema,
  DeleteEncounterActionSchema,
  type TCreateEncounterAction,
  type TListEncountersAction,
  type TGetEncounterByIdAction,
  type TUpdateEncounterAction,
  type TDeleteEncounterAction,
} from "@/modules/entities/schemas/encounter";
import {
  createEncounterController,
  listEncountersController,
  getEncounterByIdController,
  updateEncounterController,
  deleteEncounterController,
  type TCreateEncounterControllerOutput,
  type TListEncountersControllerOutput,
  type TGetEncounterByIdControllerOutput,
  type TUpdateEncounterControllerOutput,
} from "@/modules/server/core/encounter/interface-adapters/controllers";
import type { TEncounterResponse } from "@/modules/entities/schemas/encounter";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Creates an Encounter with all optional child arrays (status is required). */
export const createEncounterAction = authenticatedProcedure
  .createServerAction()
  .input(CreateEncounterActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateEncounterAction }) => {
    return await runWithTransport<TCreateEncounterControllerOutput>(async () => {
      const data = await createEncounterController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists Encounters with optional server-side filters (status, patient_id, appointment_id, date range, etc.). */
export const listEncountersAction = authenticatedProcedure
  .createServerAction()
  .input(ListEncountersActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListEncountersAction }) => {
    return await runWithTransport<TListEncountersControllerOutput>(async () => {
      const data = await listEncountersController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single Encounter by numeric ID. */
export const getEncounterByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetEncounterByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetEncounterByIdAction }) => {
    return await runWithTransport<TGetEncounterByIdControllerOutput>(async () => {
      const data = await getEncounterByIdController(input.payload);
      return { result: data };
    });
  });

/**
 * Patches scalar fields on an Encounter (status, actual_period_end, priority_*, subject_status_*, planned_end_date).
 * Structural arrays (participant, diagnosis, location, etc.) cannot be patched — delete + re-create instead.
 */
export const updateEncounterAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateEncounterActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateEncounterAction }) => {
    return await runWithTransport<TUpdateEncounterControllerOutput>(async () => {
      const data = await updateEncounterController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes an Encounter and all child records (cascade). */
export const deleteEncounterAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteEncounterActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteEncounterAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteEncounterController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });

/**
 * Resolves the first Encounter linked to a given FHIR Appointment.
 *
 * Uses flat input (no payload wrapper) with Zod coercion so the numeric
 * appointment_id travels cleanly across the Next.js server-action POST
 * boundary from client components — no skipInputParsing needed.
 *
 * @returns The matching Encounter, or null if none exists for this appointment.
 */
export const getEncounterByAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(z.object({ appointment_id: z.coerce.number().int().positive() }))
  .handler(async ({ input }: { input: { appointment_id: number } }) => {
    return await runWithTransport<TEncounterResponse | null>(async () => {
      const data = await listEncountersController({
        appointment_id: input.appointment_id,
        limit: 1,
      });
      return { result: data.data?.[0] ?? null };
    });
  });
