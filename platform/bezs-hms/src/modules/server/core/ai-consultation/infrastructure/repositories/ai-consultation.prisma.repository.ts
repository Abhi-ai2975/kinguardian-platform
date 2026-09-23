/**
 * AiConsultation Prisma repository.
 *
 * Layer: server / core / ai-consultation / infrastructure / repositories
 *
 * Implements IAiConsultationRepository using the local Prisma client. Data
 * lives in the local PostgreSQL database — not in FHIR-GQL — because AI
 * consultation sessions are proprietary application data with no FHIR equivalent.
 *
 * JSON fields (conversation, report) require a cast through `pj()` because
 * Prisma v7's custom generator does not accept plain objects for Json columns
 * without an explicit type assertion.
 *
 * Every method is instrumented with logOperation (start / success / error)
 * and a randomUUID operationId for distributed tracing.
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { NotFoundError } from "@/modules/server/shared/errors/commonErrors";
import type { IAiConsultationRepository } from "../../domain/interfaces/ai-consultation.repository.interface";
import type {
  TAiConsultationResponse,
  TCreateAiConsultation,
  TUpdateAiConsultation,
  TLinkAiConsultation,
  TAbandonAiConsultation,
} from "@/modules/entities/schemas/ai-consultation";

/**
 * Casts arbitrary values to Prisma's InputJsonValue.
 * Required for Prisma v7 with the custom generator — the generated type union
 * does not accept `Record<string, unknown>` without an explicit cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pj<T>(v: T): any {
  return v;
}

/**
 * Maps a raw Prisma AiConsultation row to the TAiConsultationResponse DTO.
 *
 * @param row - Raw Prisma query result.
 * @returns Typed TAiConsultationResponse DTO.
 */
function toDto(row: {
  id: number;
  user_id: string;
  org_id: string | null;
  patient_fhir_id: number | null;
  mode: string;
  status: string;
  conversation: unknown;
  report: unknown;
  fhir_appointment_id: number | null;
  created_at: Date;
  updated_at: Date;
}): TAiConsultationResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    org_id: row.org_id,
    patient_fhir_id: row.patient_fhir_id,
    mode: row.mode as TAiConsultationResponse["mode"],
    status: row.status as TAiConsultationResponse["status"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversation: (row.conversation as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: (row.report as any) ?? null,
    fhir_appointment_id: row.fhir_appointment_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Prisma-backed implementation of IAiConsultationRepository.
 * Registered in the DI container as IAiConsultationRepository.
 */
export class AiConsultationPrismaRepository implements IAiConsultationRepository {
  /**
   * Creates a new IN_PROGRESS AI consultation session.
   *
   * @param dto - userId, org_id, optional patient_fhir_id, mode.
   * @returns The created AiConsultation record.
   */
  async createAiConsultation(
    dto: TCreateAiConsultation,
  ): Promise<TAiConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AiConsultationPrismaRepository.createAiConsultation",
      startTimeMs,
      context: { operationId, userId: dto.userId, mode: dto.mode },
    });

    try {
      const row = await prisma.aiConsultation.create({
        data: {
          user_id: dto.userId,
          org_id: dto.org_id ?? null,
          patient_fhir_id: dto.patient_fhir_id ?? null,
          mode: dto.mode,
          status: "IN_PROGRESS",
        },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "AiConsultationPrismaRepository.createAiConsultation",
        startTimeMs,
        data: { id: result.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "AiConsultationPrismaRepository.createAiConsultation",
        startTimeMs,
        err,
        context: { operationId },
      });
      throw err;
    }
  }

  /**
   * Saves the conversation transcript and AI report, sets status to COMPLETED.
   *
   * @param dto - id, conversation array, optional report.
   * @returns The updated AiConsultation record.
   * @throws NotFoundError if the record does not exist.
   */
  async updateAiConsultation(
    dto: TUpdateAiConsultation,
  ): Promise<TAiConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AiConsultationPrismaRepository.updateAiConsultation",
      startTimeMs,
      context: { operationId, id: dto.id },
    });

    try {
      const row = await prisma.aiConsultation.update({
        where: { id: dto.id },
        data: {
          conversation: pj(dto.conversation),
          report: dto.report ? pj(dto.report) : undefined,
          status: "COMPLETED",
        },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "AiConsultationPrismaRepository.updateAiConsultation",
        startTimeMs,
        data: { id: result.id, status: result.status },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "AiConsultationPrismaRepository.updateAiConsultation",
        startTimeMs,
        err,
        context: { operationId, id: dto.id },
      });
      throw new NotFoundError(`AiConsultation ${dto.id} not found`);
    }
  }

  /**
   * Links a completed AI consultation to its follow-up FHIR appointment.
   *
   * @param dto - id, fhir_appointment_id.
   * @returns The updated AiConsultation record.
   * @throws NotFoundError if the record does not exist.
   */
  async linkToAppointment(
    dto: TLinkAiConsultation,
  ): Promise<TAiConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AiConsultationPrismaRepository.linkToAppointment",
      startTimeMs,
      context: {
        operationId,
        id: dto.id,
        fhirAppointmentId: dto.fhir_appointment_id,
      },
    });

    try {
      const row = await prisma.aiConsultation.update({
        where: { id: dto.id },
        data: { fhir_appointment_id: dto.fhir_appointment_id },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "AiConsultationPrismaRepository.linkToAppointment",
        startTimeMs,
        data: {
          id: result.id,
          fhir_appointment_id: result.fhir_appointment_id,
        },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "AiConsultationPrismaRepository.linkToAppointment",
        startTimeMs,
        err,
        context: { operationId, id: dto.id },
      });
      throw new NotFoundError(`AiConsultation ${dto.id} not found`);
    }
  }

  /**
   * Marks an in-progress AI consultation as ABANDONED.
   *
   * @param dto - id.
   * @returns The updated AiConsultation record.
   * @throws NotFoundError if the record does not exist.
   */
  async abandonAiConsultation(
    dto: TAbandonAiConsultation,
  ): Promise<TAiConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AiConsultationPrismaRepository.abandonAiConsultation",
      startTimeMs,
      context: { operationId, id: dto.id },
    });

    try {
      const row = await prisma.aiConsultation.update({
        where: { id: dto.id },
        data: { status: "ABANDONED" },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "AiConsultationPrismaRepository.abandonAiConsultation",
        startTimeMs,
        data: { id: result.id, status: result.status },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "AiConsultationPrismaRepository.abandonAiConsultation",
        startTimeMs,
        err,
        context: { operationId, id: dto.id },
      });
      throw new NotFoundError(`AiConsultation ${dto.id} not found`);
    }
  }

  /**
   * Fetches a single AI consultation by its local integer ID.
   *
   * @param id - AiConsultation.id.
   * @returns The AiConsultation record.
   * @throws NotFoundError if not found.
   */
  async getById(id: number): Promise<TAiConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AiConsultationPrismaRepository.getById",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      const row = await prisma.aiConsultation.findUnique({ where: { id } });

      if (!row) {
        throw new NotFoundError(`AiConsultation ${id} not found`);
      }

      const result = toDto(row);

      logOperation("success", {
        name: "AiConsultationPrismaRepository.getById",
        startTimeMs,
        data: { id: result.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "AiConsultationPrismaRepository.getById",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      throw err;
    }
  }
}
