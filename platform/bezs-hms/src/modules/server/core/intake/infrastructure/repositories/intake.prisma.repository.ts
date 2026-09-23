/**
 * Intake Prisma repository.
 *
 * Layer: server / core / intake / infrastructure / repositories
 *
 * Implements IIntakeRepository using the local Prisma client. Intake data
 * lives in the local PostgreSQL database — not in FHIR-GQL — because intake
 * is proprietary application data that has no FHIR representation.
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
import type { IIntakeRepository } from "../../domain/interfaces/intake.repository.interface";
import type {
  TIntakeResponse,
  TPaginatedIntakeResponse,
  TCreateIntake,
  TUpdateIntake,
  TLinkIntake,
  TAbandonIntake,
  TListIntakesQuery,
} from "@/modules/entities/schemas/intake";

/**
 * Casts arbitrary values to Prisma's InputJsonValue.
 * Required for Prisma v7 with the custom generator — the generated type
 * union does not accept `Record<string, unknown>` without an explicit cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pj<T>(v: T): any {
  return v;
}

/**
 * Maps a raw Prisma Intake row to the TIntakeResponse DTO.
 * Coerces Dates to ISO strings and narrows Json fields.
 *
 * @param row - Raw Prisma query result.
 * @returns Typed TIntakeResponse DTO.
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
}): TIntakeResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    org_id: row.org_id,
    patient_fhir_id: row.patient_fhir_id,
    mode: row.mode as TIntakeResponse["mode"],
    status: row.status as TIntakeResponse["status"],
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
 * Prisma-backed implementation of IIntakeRepository.
 * Registered in the DI container as IIntakeRepository.
 */
export class IntakePrismaRepository implements IIntakeRepository {
  /**
   * Creates a new IN_PROGRESS intake session.
   *
   * @param dto - userId, org_id, optional patient_fhir_id, mode.
   * @returns The created Intake record.
   */
  async createIntake(dto: TCreateIntake): Promise<TIntakeResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.createIntake",
      startTimeMs,
      context: { operationId, userId: dto.userId, mode: dto.mode },
    });

    try {
      const row = await prisma.intake.create({
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
        name: "IntakePrismaRepository.createIntake",
        startTimeMs,
        data: { id: result.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "IntakePrismaRepository.createIntake",
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
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  async updateIntake(dto: TUpdateIntake): Promise<TIntakeResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.updateIntake",
      startTimeMs,
      context: { operationId, intakeId: dto.id },
    });

    try {
      const row = await prisma.intake.update({
        where: { id: dto.id },
        data: {
          conversation: pj(dto.conversation),
          report: dto.report ? pj(dto.report) : undefined,
          status: "COMPLETED",
        },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "IntakePrismaRepository.updateIntake",
        startTimeMs,
        data: { id: result.id, status: result.status },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "IntakePrismaRepository.updateIntake",
        startTimeMs,
        err,
        context: { operationId, intakeId: dto.id },
      });
      throw new NotFoundError(`Intake ${dto.id} not found`);
    }
  }

  /**
   * Links a completed intake to its downstream FHIR appointment.
   *
   * @param dto - id, fhir_appointment_id.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  async linkToAppointment(dto: TLinkIntake): Promise<TIntakeResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.linkToAppointment",
      startTimeMs,
      context: {
        operationId,
        intakeId: dto.id,
        fhirAppointmentId: dto.fhir_appointment_id,
      },
    });

    try {
      const row = await prisma.intake.update({
        where: { id: dto.id },
        data: { fhir_appointment_id: dto.fhir_appointment_id },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "IntakePrismaRepository.linkToAppointment",
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
        name: "IntakePrismaRepository.linkToAppointment",
        startTimeMs,
        err,
        context: { operationId, intakeId: dto.id },
      });
      throw new NotFoundError(`Intake ${dto.id} not found`);
    }
  }

  /**
   * Marks an in-progress intake as ABANDONED.
   *
   * @param dto - id.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  async abandonIntake(dto: TAbandonIntake): Promise<TIntakeResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.abandonIntake",
      startTimeMs,
      context: { operationId, intakeId: dto.id },
    });

    try {
      const row = await prisma.intake.update({
        where: { id: dto.id },
        data: { status: "ABANDONED" },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "IntakePrismaRepository.abandonIntake",
        startTimeMs,
        data: { id: result.id, status: result.status },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "IntakePrismaRepository.abandonIntake",
        startTimeMs,
        err,
        context: { operationId, intakeId: dto.id },
      });
      throw new NotFoundError(`Intake ${dto.id} not found`);
    }
  }

  /**
   * Fetches a single intake by its local integer ID.
   *
   * @param id - Intake.id.
   * @returns The Intake record.
   * @throws NotFoundError if not found.
   */
  async getById(id: number): Promise<TIntakeResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.getById",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      const row = await prisma.intake.findUnique({ where: { id } });

      if (!row) {
        throw new NotFoundError(`Intake ${id} not found`);
      }

      const result = toDto(row);

      logOperation("success", {
        name: "IntakePrismaRepository.getById",
        startTimeMs,
        data: { id: result.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "IntakePrismaRepository.getById",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      throw err;
    }
  }

  /**
   * Returns a paginated list of intake records with optional filters.
   * Records are ordered newest-first (created_at DESC).
   *
   * @param query - Optional filters: user_id, org_id, status, mode, limit, offset.
   * @returns Paginated intake list.
   */
  async list(query: TListIntakesQuery = {}): Promise<TPaginatedIntakeResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.list",
      startTimeMs,
      context: { operationId, query },
    });

    try {
      const where = {
        ...(query.user_id ? { user_id: query.user_id } : {}),
        ...(query.org_id ? { org_id: query.org_id } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.mode ? { mode: query.mode } : {}),
      };

      const limit = query.limit ?? 10;
      const offset = query.offset ?? 0;

      const [rows, total] = await Promise.all([
        prisma.intake.findMany({
          where,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.intake.count({ where }),
      ]);

      const result: TPaginatedIntakeResponse = {
        total,
        limit,
        offset,
        data: rows.map(toDto),
      };

      logOperation("success", {
        name: "IntakePrismaRepository.list",
        startTimeMs,
        data: { total, returned: rows.length },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "IntakePrismaRepository.list",
        startTimeMs,
        err,
        context: { operationId, query },
      });
      throw err;
    }
  }

  /**
   * Fetches the intake linked to a specific FHIR appointment ID.
   * Returns null when no intake was linked (appointment was booked directly).
   *
   * @param fhirAppointmentId - FHIR Appointment.id.
   * @returns Linked Intake record or null.
   */
  async getByFhirAppointmentId(
    fhirAppointmentId: number,
  ): Promise<TIntakeResponse | null> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "IntakePrismaRepository.getByFhirAppointmentId",
      startTimeMs,
      context: { operationId, fhirAppointmentId },
    });

    try {
      const row = await prisma.intake.findFirst({
        where: { fhir_appointment_id: fhirAppointmentId },
      });

      const result = row ? toDto(row) : null;

      logOperation("success", {
        name: "IntakePrismaRepository.getByFhirAppointmentId",
        startTimeMs,
        data: { found: result !== null, id: result?.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "IntakePrismaRepository.getByFhirAppointmentId",
        startTimeMs,
        err,
        context: { operationId, fhirAppointmentId },
      });
      throw err;
    }
  }
}
