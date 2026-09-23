/**
 * AppointmentCoreRestService — HTTP calls for the Appointment resource.
 *
 * Layer: server / core / appointment / infrastructure / services / rest
 *
 * Handles all 7 operations (book, create, getMe, list, getById, update, delete)
 * against the fhir-gql /appointments endpoint. Receives a pre-configured
 * AxiosInstance from the shell (AppointmentRestApiService) — no auth setup here.
 *
 * Note on getMe: fhir-gql's /appointments/me resolves the JWT sub claim to the
 * service account (not the end user). Instead we call GET /appointments/ with a
 * user_id query param injected from the drgodly session, which achieves the same
 * row-level filter without the JWT identity mismatch.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  AppointmentResponseSchema,
  PaginatedAppointmentResponseSchema,
  type TAppointmentResponse,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import {
  type TBookAppointment,
  type TCreateAppointment,
  type TListAppointmentsQuery,
  type TGetMyAppointments,
  type TAppointmentPatchDto,
} from "@/modules/entities/schemas/appointment";
import { handleAppointmentApiError } from "./appointment.rest.errors";

/**
 * Handles all 7 appointment HTTP operations.
 * Instantiated and owned by AppointmentRestApiService shell.
 */
export class AppointmentCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /appointments/book — atomic booking via simplified endpoint.
   * fhir-gql links the slot, builds participants, and marks the slot busy in one tx.
   *
   * @param dto - Booking payload (practitioner_id, slot_id, patient_id + optional metadata).
   * @returns The newly created Appointment.
   * @throws ConflictError if the slot is no longer free (409).
   */
  async book(dto: TBookAppointment): Promise<TAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.book",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/book", dto);
      const data = await AppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.book",
        startTimeMs,
        data,
        context: { operationId, appointmentId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.book",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * POST /appointments/ — full FHIR appointment create.
   *
   * @param dto - Full create payload; status and participant (≥1) required.
   * @returns The newly created Appointment.
   */
  async create(dto: TCreateAppointment): Promise<TAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await AppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.create",
        startTimeMs,
        data,
        context: { operationId, appointmentId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * GET /appointments/?user_id=... — returns the caller's own appointments.
   * userId is injected from the drgodly session, not derived from the fhir-gql JWT.
   *
   * @param userId - drgodly user ID to filter by.
   * @param query - Optional additional filters (status, start_from, start_to, limit, offset).
   * @returns Paginated appointment list for the given user.
   */
  async getMe(
    userId: string,
    query: Omit<TGetMyAppointments, "userId">,
  ): Promise<TPaginatedAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.getMe",
      startTimeMs,
      context: { operationId, userId },
    });
    try {
      const res = await this.client.get<unknown>("/", {
        params: { user_id: userId, ...query },
      });
      const data = await PaginatedAppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.getMe",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.getMe",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * GET /appointments/ — paginated list with optional cross-tenant filters.
   *
   * @param query - Filters (status, patient_id, start_from, start_to, user_id, org_id, limit, offset).
   * @returns Paginated appointment list.
   */
  async list(query?: TListAppointmentsQuery): Promise<TPaginatedAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.list",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedAppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.list",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * GET /appointments/{id} — fetches a single Appointment by numeric ID.
   *
   * @param id - Appointment DB id.
   * @returns The Appointment resource with all embedded child arrays.
   */
  async getById(id: number): Promise<TAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.getById",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await AppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.getById",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.getById",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /appointments/{id} — patches scalar fields on an Appointment.
   *
   * @param id - Appointment DB id.
   * @param dto - Scalar fields to update (status, dates, cancellation, priority, etc.).
   * @returns The updated Appointment resource.
   */
  async update(id: number, dto: TAppointmentPatchDto): Promise<TAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.update",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await AppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.update",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.update",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * POST /appointments/{id}/reschedule — atomically swaps to a new slot.
   * Backend frees old slot, updates appointment start/end, marks new slot busy.
   *
   * @param id - Appointment DB id.
   * @param newSlotId - Integer ID of the new free Slot.
   * @returns The updated Appointment resource.
   * @throws ConflictError if the new slot is not free (409).
   */
  async reschedule(id: number, newSlotId: number): Promise<TAppointmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.reschedule",
      startTimeMs,
      context: { operationId, id, newSlotId },
    });
    try {
      const res = await this.client.post<unknown>(`/${id}/reschedule`, {
        new_slot_id: newSlotId,
      });
      const data = await AppointmentResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "AppointmentCoreRestService.reschedule",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.reschedule",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /appointments/{id} — removes an Appointment and all child records.
   *
   * @param id - Appointment DB id.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppointmentCoreRestService.delete",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "AppointmentCoreRestService.delete",
        startTimeMs,
        context: { operationId },
      });
    } catch (err) {
      logOperation("error", {
        name: "AppointmentCoreRestService.delete",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleAppointmentApiError(err);
      throw err;
    }
  }
}
