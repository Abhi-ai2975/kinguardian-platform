/**
 * Intake core server actions.
 *
 * Layer: presentation / actions / intake
 *
 * All 6 intake operations as ZSA server actions using authenticatedProcedure.
 * createIntakeAction injects the session userId so the client never needs to
 * supply it (preventing impersonation).
 *
 * Intake data lives in the local Prisma DB — not FHIR-GQL.
 */

"use server";

import type { AuthResponse } from "@/modules/server/auth/types";
import {
  CreateIntakeActionSchema,
  UpdateIntakeActionSchema,
  LinkIntakeActionSchema,
  AbandonIntakeActionSchema,
  GetIntakeByIdActionSchema,
  GetIntakeByFhirAppointmentIdActionSchema,
  ListIntakesActionSchema,
  type TCreateIntakeAction,
  type TUpdateIntakeAction,
  type TLinkIntakeAction,
  type TAbandonIntakeAction,
  type TGetIntakeByIdAction,
  type TGetIntakeByFhirAppointmentIdAction,
  type TListIntakesAction,
} from "@/modules/entities/schemas/intake";
import {
  createIntakeController,
  updateIntakeController,
  linkIntakeToAppointmentController,
  abandonIntakeController,
  getIntakeByIdController,
  getIntakeByFhirAppointmentIdController,
  listIntakesController,
  type TCreateIntakeControllerOutput,
  type TUpdateIntakeControllerOutput,
  type TLinkIntakeControllerOutput,
  type TAbandonIntakeControllerOutput,
  type TGetIntakeByIdControllerOutput,
  type TGetIntakeByFhirAppointmentIdControllerOutput,
  type TListIntakesControllerOutput,
} from "@/modules/server/core/intake/interface-adapters/controllers";
import { authenticatedProcedure } from "../procedures";

/**
 * Creates a new IN_PROGRESS intake session.
 * The session userId is injected server-side — the client cannot supply a
 * different userId to start an intake on behalf of another user.
 */
export const createIntakeAction = authenticatedProcedure
  .createServerAction()
  .input(CreateIntakeActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateIntakeAction;
      ctx: { session: AuthResponse };
    }): Promise<TCreateIntakeControllerOutput> => {
      // Inject userId from session — client supplies only mode + optional fields
      const enrichedPayload = {
        ...input.payload,
        userId: ctx.session.session.userId,
      };
      return createIntakeController(enrichedPayload);
    },
  );

/**
 * Completes an intake session — saves conversation transcript + AI report
 * and flips status to COMPLETED.
 */
export const updateIntakeAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateIntakeActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TUpdateIntakeAction;
    }): Promise<TUpdateIntakeControllerOutput> => {
      return updateIntakeController(input.payload);
    },
  );

/**
 * Links a completed intake to the FHIR appointment the patient just booked.
 * Call this immediately after a successful bookAppointmentAction when
 * intake_id was present in the booking flow.
 */
export const linkIntakeToAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(LinkIntakeActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TLinkIntakeAction;
    }): Promise<TLinkIntakeControllerOutput> => {
      return linkIntakeToAppointmentController(input.payload);
    },
  );

/**
 * Marks an in-progress intake as ABANDONED.
 * Called when the patient navigates away without completing.
 */
export const abandonIntakeAction = authenticatedProcedure
  .createServerAction()
  .input(AbandonIntakeActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TAbandonIntakeAction;
    }): Promise<TAbandonIntakeControllerOutput> => {
      return abandonIntakeController(input.payload);
    },
  );

/** Fetches a single intake by its local integer ID. */
export const getIntakeByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetIntakeByIdActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TGetIntakeByIdAction;
    }): Promise<TGetIntakeByIdControllerOutput> => {
      return getIntakeByIdController(input.payload);
    },
  );

/**
 * Doctor-side: retrieves the intake linked to a FHIR appointment.
 * Returns null when no intake exists for that appointment.
 */
export const getIntakeByFhirAppointmentIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetIntakeByFhirAppointmentIdActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TGetIntakeByFhirAppointmentIdAction;
    }): Promise<TGetIntakeByFhirAppointmentIdControllerOutput> => {
      return getIntakeByFhirAppointmentIdController(input.payload);
    },
  );

/**
 * Returns a paginated list of AI Intake records.
 * Patient portal passes user_id to scope to own records.
 * Admin/doctor portal can omit user_id to see org-wide records.
 */
export const listIntakesAction = authenticatedProcedure
  .createServerAction()
  .input(ListIntakesActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TListIntakesAction;
    }): Promise<TListIntakesControllerOutput> => {
      return listIntakesController(input.payload);
    },
  );
