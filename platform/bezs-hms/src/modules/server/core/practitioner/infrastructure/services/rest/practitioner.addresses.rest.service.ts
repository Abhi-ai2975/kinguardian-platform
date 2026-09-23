/**
 * PractitionerAddressesRestService — Address sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/addresses endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerAddressResponseSchema,
  PractitionerAddressListResponseSchema,
  type TPractitionerAddressResponse,
  type TPractitionerAddressListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerAddress,
  type TPatchPractitionerAddressDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the addresses sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerAddressesRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/addresses — adds an Address.
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Address fields.
   * @returns The created address record.
   */
  async add(practitionerId: number, dto: TAddPractitionerAddress): Promise<TPractitionerAddressResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerAddressesRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/addresses`, dto);
      const data = await PractitionerAddressResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerAddressesRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerAddressesRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/addresses — lists all addresses.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response.
   */
  async list(practitionerId: number): Promise<TPractitionerAddressListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerAddressesRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/addresses`);
      const data = await PractitionerAddressListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerAddressesRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerAddressesRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/addresses/{addressId} — patches an address.
   * @param practitionerId - Parent Practitioner id.
   * @param addressId - Address record id.
   * @param dto - Fields to update.
   * @returns The updated address record.
   */
  async patch(practitionerId: number, addressId: number, dto: TPatchPractitionerAddressDto): Promise<TPractitionerAddressResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerAddressesRestService.patch", startTimeMs, context: { operationId, practitionerId, addressId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/addresses/${addressId}`, dto);
      const data = await PractitionerAddressResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerAddressesRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerAddressesRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/addresses/{addressId} — removes an address.
   * @param practitionerId - Parent Practitioner id.
   * @param addressId - Address record id.
   */
  async delete(practitionerId: number, addressId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerAddressesRestService.delete", startTimeMs, context: { operationId, practitionerId, addressId } });
    try {
      await this.client.delete(`/${practitionerId}/addresses/${addressId}`);
      logOperation("success", { name: "PractitionerAddressesRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerAddressesRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
