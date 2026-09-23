/**
 * MedicationRequestRestApiService — REST transport shell for the MedicationRequest resource.
 *
 * Layer: server / core / medication-request / infrastructure / services
 *
 * Implements IMedicationRequestService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/medication-requests) and delegating all 5 methods to MedicationRequestCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IMedicationRequestService } from "../../domain/interfaces/medication-request.service.interface";
import { MedicationRequestCoreRestService } from "./rest/medication-request.core.rest.service";
import {
  type TMedicationRequestResponse,
  type TPaginatedMedicationRequestResponse,
  type TCreateMedicationRequest,
  type TUpdateMedicationRequestDto,
  type TListMedicationRequestsQuery,
} from "@/modules/entities/schemas/medication-request";

/**
 * Thin shell that wires a single AxiosInstance to MedicationRequestCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class MedicationRequestRestApiService implements IMedicationRequestService {
  private readonly core: MedicationRequestCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/medication-requests`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new MedicationRequestCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateMedicationRequest): Promise<TMedicationRequestResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListMedicationRequestsQuery): Promise<TPaginatedMedicationRequestResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TMedicationRequestResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdateMedicationRequestDto): Promise<TMedicationRequestResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
