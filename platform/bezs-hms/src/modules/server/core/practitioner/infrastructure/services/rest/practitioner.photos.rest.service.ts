/**
 * PractitionerPhotosRestService — Attachment (photo) sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/photos endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerPhotoResponseSchema,
  PractitionerPhotoListResponseSchema,
  type TPractitionerPhotoResponse,
  type TPractitionerPhotoListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerPhoto,
  type TPatchPractitionerPhotoDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the photos sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerPhotosRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/photos — adds a photo Attachment.
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Photo fields (url or base-64 data).
   * @returns The created photo record.
   */
  async add(practitionerId: number, dto: TAddPractitionerPhoto): Promise<TPractitionerPhotoResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerPhotosRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/photos`, dto);
      const data = await PractitionerPhotoResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerPhotosRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerPhotosRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/photos — lists all photos.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response.
   */
  async list(practitionerId: number): Promise<TPractitionerPhotoListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerPhotosRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/photos`);
      const data = await PractitionerPhotoListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerPhotosRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerPhotosRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/photos/{photoId} — patches a photo.
   * @param practitionerId - Parent Practitioner id.
   * @param photoId - Photo record id.
   * @param dto - Fields to update.
   * @returns The updated photo record.
   */
  async patch(practitionerId: number, photoId: number, dto: TPatchPractitionerPhotoDto): Promise<TPractitionerPhotoResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerPhotosRestService.patch", startTimeMs, context: { operationId, practitionerId, photoId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/photos/${photoId}`, dto);
      const data = await PractitionerPhotoResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerPhotosRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerPhotosRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/photos/{photoId} — removes a photo.
   * @param practitionerId - Parent Practitioner id.
   * @param photoId - Photo record id.
   */
  async delete(practitionerId: number, photoId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerPhotosRestService.delete", startTimeMs, context: { operationId, practitionerId, photoId } });
    try {
      await this.client.delete(`/${practitionerId}/photos/${photoId}`);
      logOperation("success", { name: "PractitionerPhotosRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerPhotosRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
