/**
 * SlotCoreRestService — HTTP calls for the Slot resource.
 *
 * Layer: server / core / slot / infrastructure / services / rest
 *
 * Handles all 5 operations (create, list, getById, update, delete) against the
 * fhir-gql /slots endpoint. Receives a pre-configured AxiosInstance from the
 * shell (SlotRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  SlotResponseSchema,
  PaginatedSlotResponseSchema,
  SlotGenerateResponseSchema,
  type TSlotResponse,
  type TPaginatedSlotResponse,
  type TSlotGenerateResponse,
} from "@/modules/entities/schemas/slot";
import {
  type TCreateSlot,
  type TSlotPatchDto,
  type TListSlotsQuery,
  type TGenerateSlots,
} from "@/modules/entities/schemas/slot";
import { handleSlotApiError } from "./slot.rest.errors";

/**
 * Handles create / list / getById / update / delete HTTP calls.
 * Instantiated and owned by SlotRestApiService shell.
 */
export class SlotCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /slots/ — creates a Slot with all inline child arrays.
   * @param dto - Creation payload. schedule and status are required.
   * @returns The created Slot.
   */
  async create(dto: TCreateSlot): Promise<TSlotResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "SlotCoreRestService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await SlotResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "SlotCoreRestService.create",
        startTimeMs,
        data,
        context: { operationId, slotId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "SlotCoreRestService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleSlotApiError(err);
      throw err;
    }
  }

  /**
   * GET /slots/ — lists Slots with optional filters and pagination.
   * @param query - Optional filter params (status, schedule_id, practitioner_role_id, etc.).
   * @returns Paginated list.
   */
  async list(query?: TListSlotsQuery): Promise<TPaginatedSlotResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "SlotCoreRestService.list",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedSlotResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "SlotCoreRestService.list",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "SlotCoreRestService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleSlotApiError(err);
      throw err;
    }
  }

  /**
   * GET /slots/{id} — fetches a single Slot by numeric ID.
   * @param id - Slot DB id.
   * @returns The Slot resource with all embedded child arrays.
   */
  async getById(id: number): Promise<TSlotResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "SlotCoreRestService.getById",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await SlotResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "SlotCoreRestService.getById",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "SlotCoreRestService.getById",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleSlotApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /slots/{id} — patches scalar fields on a Slot.
   * @param id - Slot DB id.
   * @param dto - Scalar fields to update (status, start, end, overbooked, comment, appointment_type_*).
   * @returns The updated Slot resource.
   */
  async update(id: number, dto: TSlotPatchDto): Promise<TSlotResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "SlotCoreRestService.update",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await SlotResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "SlotCoreRestService.update",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "SlotCoreRestService.update",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleSlotApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /slots/{id} — removes a Slot and all child records.
   * @param id - Slot DB id.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "SlotCoreRestService.delete",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "SlotCoreRestService.delete",
        startTimeMs,
        context: { operationId },
      });
    } catch (err) {
      logOperation("error", {
        name: "SlotCoreRestService.delete",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleSlotApiError(err);
      throw err;
    }
  }

  /**
   * POST /slots/generate — bulk-generates free Slots for a Schedule within a
   * time window. Registered before /{resource_id} on the fhir-gql side so
   * "generate" is never mistaken for an integer path param.
   * @param dto - schedule_id, generation window, duration, and optional overrides.
   * @returns Summary with generated_count, slot_ids, and the generation window used.
   */
  async generate(dto: TGenerateSlots): Promise<TSlotGenerateResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "SlotCoreRestService.generate",
      startTimeMs,
      context: { operationId, scheduleId: dto.schedule_id },
    });
    try {
      const res = await this.client.post<unknown>("/generate", dto);
      const data = await SlotGenerateResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "SlotCoreRestService.generate",
        startTimeMs,
        data,
        context: {
          operationId,
          generatedCount: data.generated_count,
        },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "SlotCoreRestService.generate",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleSlotApiError(err);
      throw err;
    }
  }
}
