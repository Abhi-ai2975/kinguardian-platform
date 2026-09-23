/**
 * AiConsultation core server actions.
 *
 * Layer: presentation / actions / ai-consultation
 *
 * All 5 AI consultation operations as ZSA server actions using
 * authenticatedProcedure. createAiConsultationAction injects the session userId
 * so the client never needs to supply it (preventing impersonation).
 *
 * AI consultation data lives in the local Prisma DB — not FHIR-GQL.
 */

"use server";

import type { AuthResponse } from "@/modules/server/auth/types";
import {
  CreateAiConsultationActionSchema,
  UpdateAiConsultationActionSchema,
  LinkAiConsultationActionSchema,
  AbandonAiConsultationActionSchema,
  GetAiConsultationByIdActionSchema,
  type TCreateAiConsultationAction,
  type TUpdateAiConsultationAction,
  type TLinkAiConsultationAction,
  type TAbandonAiConsultationAction,
  type TGetAiConsultationByIdAction,
} from "@/modules/entities/schemas/ai-consultation";
import {
  createAiConsultationController,
  updateAiConsultationController,
  linkAiConsultationToAppointmentController,
  abandonAiConsultationController,
  getAiConsultationByIdController,
  type TCreateAiConsultationControllerOutput,
  type TUpdateAiConsultationControllerOutput,
  type TLinkAiConsultationControllerOutput,
  type TAbandonAiConsultationControllerOutput,
  type TGetAiConsultationByIdControllerOutput,
} from "@/modules/server/core/ai-consultation/interface-adapters/controllers";
import { authenticatedProcedure } from "../procedures";

/**
 * Creates a new IN_PROGRESS AI consultation session.
 * The session userId is injected server-side — the client cannot supply a
 * different userId to start a consultation on behalf of another user.
 */
export const createAiConsultationAction = authenticatedProcedure
  .createServerAction()
  .input(CreateAiConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateAiConsultationAction;
      ctx: { session: AuthResponse };
    }): Promise<TCreateAiConsultationControllerOutput> => {
      // Inject userId from session — client supplies only mode + optional fields
      const enrichedPayload = {
        ...input.payload,
        userId: ctx.session.session.userId,
      };
      return createAiConsultationController(enrichedPayload);
    },
  );

/**
 * Completes an AI consultation session — saves conversation transcript + AI
 * report and flips status to COMPLETED.
 */
export const updateAiConsultationAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateAiConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TUpdateAiConsultationAction;
    }): Promise<TUpdateAiConsultationControllerOutput> => {
      return updateAiConsultationController(input.payload);
    },
  );

/**
 * Links a completed AI consultation to the FHIR appointment the patient just
 * booked. Call this immediately after a successful bookAppointmentAction when
 * consultation_id was present in the booking flow.
 */
export const linkAiConsultationToAppointmentAction = authenticatedProcedure
  .createServerAction()
  .input(LinkAiConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TLinkAiConsultationAction;
    }): Promise<TLinkAiConsultationControllerOutput> => {
      return linkAiConsultationToAppointmentController(input.payload);
    },
  );

/**
 * Marks an in-progress AI consultation as ABANDONED.
 * Called when the patient navigates away without completing.
 */
export const abandonAiConsultationAction = authenticatedProcedure
  .createServerAction()
  .input(AbandonAiConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TAbandonAiConsultationAction;
    }): Promise<TAbandonAiConsultationControllerOutput> => {
      return abandonAiConsultationController(input.payload);
    },
  );

/** Fetches a single AI consultation by its local integer ID. */
export const getAiConsultationByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetAiConsultationByIdActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TGetAiConsultationByIdAction;
    }): Promise<TGetAiConsultationByIdControllerOutput> => {
      return getAiConsultationByIdController(input.payload);
    },
  );
